import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  Category,
  BusinessSchema,
  ActionInput,
  OutcomeInput,
  type Business,
  type Action,
  type Analysis,
} from "@tastekey/shared-types";
import { callQloo, configured, QlooError } from "@tastekey/qloo-adapter";
import { analyze } from "@tastekey/studio-engine";
import { interpretCorrection } from "@tastekey/agent-orchestrator";
import {
  newSession,
  tenantFor,
  workspace,
  put,
  get,
  deleteWorkspace,
} from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const limits = new Map<string, { at: number; count: number }>();
let globalCalls = { at: Date.now(), count: 0 };
function rate(key: string, max = 30) {
  const now = Date.now();
  const row = limits.get(key);
  if (row && now - row.at < 60000) {
    if (row.count >= max)
      throw new QlooError("RATE", "Too many requests. Wait one minute.");
    row.count++;
  } else limits.set(key, { at: now, count: 1 });
  if (limits.size > 2000)
    for (const [k, v] of limits) if (now - v.at > 60000) limits.delete(k);
}
function quota() {
  if (Date.now() - globalCalls.at > 3600000)
    globalCalls = { at: Date.now(), count: 0 };
  if (globalCalls.count >= Number(process.env.QLOO_REQUESTS_PER_HOUR || 100))
    throw new QlooError(
      "RATE",
      "The application’s hourly Qloo request allowance is exhausted.",
    );
  globalCalls.count++;
}
function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
async function route(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname.replace("/api/", "");
    if (request.method === "GET" && path === "status")
      return response({
        qloo: await configured(),
        model: !!(
          process.env.MODEL_API_KEY &&
          process.env.MODEL_BASE_URL &&
          process.env.MODEL_NAME
        ),
        storage: "SQLite; private browser session",
        version: "0.1.0",
      });
    if (request.method !== "GET") {
      const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
      if (request.headers.get("origin") !== expected)
        return response({ error: "Origin not allowed." }, 403);
      if (Number(request.headers.get("content-length") || 0) > 50000)
        return response({ error: "Request too large." }, 413);
    }
    if (path === "session" && request.method === "POST") {
      let token = request.cookies.get("tastekey_session")?.value;
      if (!tenantFor(token)) {
        rate(
          `session:${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`,
          10,
        );
        token = newSession();
      }
      const res = response({ ready: true });
      res.cookies.set("tastekey_session", token!, {
        httpOnly: true,
        secure: (process.env.APP_ORIGIN || request.nextUrl.origin).startsWith(
          "https:",
        ),
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 86400,
      });
      return res;
    }
    const tenant = tenantFor(request.cookies.get("tastekey_session")?.value);
    if (!tenant)
      return response(
        { error: "Start a private session before continuing." },
        401,
      );
    rate(tenant);
    if (request.method === "GET" && path === "workspace")
      return response(workspace(tenant));
    if (request.method === "DELETE" && path === "workspace") {
      deleteWorkspace(tenant);
      const res = response({ deleted: true });
      res.cookies.delete("tastekey_session");
      return res;
    }
    if (request.method !== "POST")
      return response({ error: "Route not found." }, 404);
    const raw = await request.text();
    if (raw.length > 50000)
      return response({ error: "Request too large." }, 413);
    const body = JSON.parse(raw || "{}");
    if (path === "search") {
      const { query, category } = z
        .object({
          query: z.string().trim().min(2).max(150),
          category: Category.exclude(["design"]),
        })
        .parse(body);
      quota();
      return response(await callQloo("search", { query }, category));
    }
    if (path === "recommend") {
      const { entities, category } = z
        .object({
          entities: z
            .array(z.string().regex(/^[a-zA-Z0-9:_-]{1,150}$/))
            .min(1)
            .max(10),
          category: Category.exclude(["design"]),
        })
        .parse(body);
      quota();
      return response(
        await callQloo("insights", { entities: entities.join(",") }, category),
      );
    }
    if (path === "correction") {
      const { text, modelConsent } = z
        .object({
          text: z.string().trim().min(3).max(1500),
          modelConsent: z.literal(true),
        })
        .parse(body);
      void modelConsent;
      return response(await interpretCorrection(text));
    }
    if (path === "business") {
      const input = BusinessSchema.parse(body.input);
      const id = z.string().uuid().optional().parse(body.id);
      if (id && !get<Business>(tenant, "business", id))
        return response({ error: "Business not found." }, 404);
      const b: Business = {
        ...input,
        id: id || crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      put(tenant, "business", b.id, b);
      return response(b);
    }
    if (path === "analysis") {
      const { businessId, scenario, baseline, useModel } = z
        .object({
          businessId: z.string().uuid(),
          scenario: BusinessSchema.optional(),
          baseline: z.boolean().default(false),
          useModel: z.boolean().default(false),
        })
        .parse(body);
      const b = get<Business>(tenant, "business", businessId);
      if (!b) return response({ error: "Business not found." }, 404);
      const records = workspace(tenant);
      const rejected = records.analyses
        .filter((a) => a.businessId === businessId)
        .flatMap((a) => a.strategies.filter((s) => s.status === "rejected"));
      if (!baseline) quota();
      const a = await analyze(
        scenario || b,
        businessId,
        records.outcomes.filter((o) => o.businessId === businessId),
        baseline,
        rejected,
        useModel,
      );
      put(tenant, "analysis", businessId, a);
      return response(a);
    }
    if (path === "strategy") {
      const { analysisId, strategyId, status, revision } = z
        .object({
          analysisId: z.string().uuid(),
          strategyId: z.string().uuid(),
          status: z.enum(["accepted", "rejected", "proposed"]),
          revision: z.string().max(1000).optional(),
        })
        .parse(body);
      const a = get<Analysis>(tenant, "analysis", analysisId);
      if (!a) return response({ error: "Analysis not found." }, 404);
      const s = a.strategies.find((s) => s.id === strategyId);
      if (!s) return response({ error: "Strategy not found." }, 404);
      s.status = status;
      s.revision = revision;
      put(tenant, "analysis", a.businessId, a);
      return response(a);
    }
    if (path === "action") {
      const { businessId, id, strategyId, analysisId } = z
        .object({
          businessId: z.string().uuid(),
          id: z.string().uuid().optional(),
          strategyId: z.string().uuid().optional(),
          analysisId: z.string().uuid().optional(),
        })
        .parse(body);
      if (!get<Business>(tenant, "business", businessId))
        return response({ error: "Business not found." }, 404);
      if (id) {
        const existing = get<Action>(tenant, "action", id);
        if (!existing || existing.businessId !== businessId)
          return response({ error: "Action not found." }, 404);
      }
      if (strategyId) {
        const a = analysisId
          ? get<Analysis>(tenant, "analysis", analysisId)
          : null;
        const s = a?.strategies.find((s) => s.id === strategyId);
        if (!s || s.status !== "accepted" || a?.businessId !== businessId)
          return response(
            { error: "Accept this business’s strategy first." },
            403,
          );
      }
      const action = {
        ...ActionInput.parse(body.input),
        id: id || crypto.randomUUID(),
        businessId,
        strategyId,
      };
      put(tenant, "action", businessId, action);
      return response(action);
    }
    if (path === "outcome") {
      const input = OutcomeInput.parse(body.input);
      const action = get<Action>(tenant, "action", input.actionId);
      if (!action) return response({ error: "Action not found." }, 404);
      const outcome = {
        ...input,
        id: crypto.randomUUID(),
        businessId: action.businessId,
      };
      put(tenant, "outcome", action.businessId, outcome);
      return response(outcome);
    }
    return response({ error: "Route not found." }, 404);
  } catch (err) {
    if (err instanceof z.ZodError)
      return response(
        {
          error: "Please check the highlighted input requirements.",
          details: err.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    if (err instanceof SyntaxError)
      return response({ error: "Invalid JSON request." }, 400);
    if (err instanceof QlooError)
      return response(
        { error: err.message, code: err.code },
        err.code === "RATE" ? 429 : 503,
      );
    // No untrusted child process, database, or model error text is returned to the browser.
    console.error(
      JSON.stringify({
        event: "request-failed",
        path: request.nextUrl.pathname,
        type: err instanceof Error ? err.name : "Unknown",
      }),
    );
    return response(
      {
        error:
          "This request could not complete. Check server configuration and try again.",
      },
      500,
    );
  }
}
export { route as GET, route as POST, route as DELETE };
