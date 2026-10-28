import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  Category,
  BusinessSchema,
  ActionInput,
  OutcomeInput,
  ReviewInput,
  AudienceContribution,
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
  createRecoveryCode,
  recoverWorkspace,
  createAudienceInvite,
  audienceInvite,
  contributeAudience,
  ownContributions,
  withdrawAudience,
  audienceReport,
  reserveModelCall,
} from "@/lib/db";
import { modelConfigured } from "@tastekey/agent-orchestrator";
import { authRoute, authConfigured } from "@/lib/auth";
import {
  identity,
  AccessError,
  assertWrite,
  requireRole,
  verifiedParticipant,
  team,
  inviteMember,
  acceptInvite,
  changeMember,
  transferOwnership,
  switchWorkspace,
  renameWorkspace,
  revokeInvite,
} from "@/lib/identity";
import { db } from "@/lib/db";
import {
  integration,
  configureSite,
  saveOffer,
  removeOffer,
  publicCatalog,
  OfferInput,
} from "@/lib/integrations";
import { widgetResponse } from "@/lib/widget";
import { readRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";
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
    headers: { "Cache-Control": "no-store", "X-Frame-Options": "DENY" },
  });
}
async function route(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname.replace("/api/", "");
    if (request.method === "GET" && path.startsWith("widget/")) {
      const catalog = publicCatalog(path.slice("widget/".length));
      return catalog
        ? widgetResponse(catalog)
        : response({ error: "This widget is unavailable." }, 404);
    }
    if (request.method === "GET" && path.startsWith("widget-data/")) {
      const catalog = publicCatalog(path.slice("widget-data/".length));
      return catalog
        ? response(catalog)
        : response({ error: "This widget is unavailable." }, 404);
    }
    if (request.method === "GET" && path === "status")
      return response({
        qloo: await configured(),
        model: modelConfigured(),
        storage: "SQLite; verified workspaces and private demo sessions",
        version: "0.1.0",
        release: /^[a-f0-9]{40}$/.test(process.env.APP_RELEASE || "")
          ? process.env.APP_RELEASE
          : "unknown",
        signIn: authConfigured(),
      });
    if (request.method !== "GET") {
      const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
      if (request.headers.get("origin") !== expected)
        return response({ error: "Origin not allowed." }, 403);
      if (Number(request.headers.get("content-length") || 0) > 50000)
        return response({ error: "Request too large." }, 413);
    }
    if (path.startsWith("auth/")) {
      if (path === "auth/start")
        rate(
          `auth:${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`,
          6,
        );
      const result = await authRoute(request, path);
      if (result) {
        result.headers.set("X-Frame-Options", "DENY");
        return result;
      }
    }
    if (path === "recovery/restore" && request.method === "POST") {
      rate(
        `recovery:${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`,
        5,
      );
      const raw = await readRequestBody(request);
      const { code } = z
        .object({ code: z.string().regex(/^[a-f0-9]{64}$/) })
        .parse(JSON.parse(raw));
      const token = recoverWorkspace(code);
      if (!token)
        return response(
          { error: "Recovery code is invalid, expired or already used." },
          403,
        );
      const res = response({ restored: true });
      res.cookies.set("tastekey_session", token, {
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
    if (path === "session" && request.method === "POST") {
      let token = request.cookies.get("tastekey_session")?.value;
      if (!tenantFor(token)) {
        rate(
          `session:${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`,
          Number(process.env.TASTEKEY_SESSION_REQUESTS_PER_MINUTE || 10),
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
    const sessionToken = request.cookies.get("tastekey_session")?.value;
    const who = identity(sessionToken);
    const tenant = tenantFor(sessionToken);
    if (!tenant)
      return response(
        { error: "Start a private session before continuing." },
        401,
      );
    rate(tenant);
    if (path === "integration" && request.method === "GET") {
      const id = z.uuid().parse(request.nextUrl.searchParams.get("businessId"));
      return response(integration(tenant, id));
    }
    if (path === "team" && request.method === "GET")
      return response(team(sessionToken!));
    if (request.method === "GET" && path === "workspace")
      return response(workspace(tenant));
    if (request.method === "GET" && path === "audience/mine")
      return response(
        who
          ? [
              ...ownContributions(tenant),
              ...ownContributions(verifiedParticipant(sessionToken!)),
            ]
          : ownContributions(tenant),
      );
    if (request.method === "GET" && path === "audience/report") {
      const id = z
        .string()
        .uuid()
        .parse(request.nextUrl.searchParams.get("businessId"));
      if (!get(tenant, "business", id))
        return response({ error: "Business not found." }, 404);
      return response(audienceReport(id));
    }
    if (request.method === "DELETE" && path === "workspace") {
      assertWrite(sessionToken, true);
      deleteWorkspace(tenant);
      const res = response({ deleted: true });
      res.cookies.delete("tastekey_session");
      return res;
    }
    if (request.method !== "POST")
      return response({ error: "Route not found." }, 404);
    const raw = await readRequestBody(request);
    const body = JSON.parse(raw || "{}");
    if (path === "integration/settings") {
      const input = z
        .object({
          businessId: z.uuid(),
          origin: z.url().max(300),
          enabled: z.boolean(),
        })
        .parse(body);
      return response(
        configureSite(sessionToken!, tenant, input.businessId, input),
      );
    }
    if (path === "integration/offer") {
      const input = z
        .object({
          businessId: z.uuid(),
          id: z.uuid().optional(),
          published: z.boolean(),
          offer: OfferInput,
        })
        .parse(body);
      return response(
        saveOffer(
          sessionToken,
          tenant,
          input.businessId,
          input.offer,
          input.id,
          input.published,
        ),
      );
    }
    if (path === "integration/remove-offer") {
      removeOffer(
        sessionToken,
        tenant,
        z.object({ id: z.uuid() }).parse(body).id,
      );
      return response({ removed: true });
    }
    if (
      [
        "business",
        "analysis",
        "strategy",
        "action",
        "outcome",
        "review",
      ].includes(path)
    )
      assertWrite(sessionToken);
    if (path === "team/switch") {
      const { workspaceId } = z
        .object({ workspaceId: z.string().min(1).max(100) })
        .parse(body);
      switchWorkspace(sessionToken!, workspaceId);
      return response({ switched: true });
    }
    if (path === "team/name") {
      const { name } = z
        .object({ name: z.string().trim().min(2).max(80) })
        .parse(body);
      renameWorkspace(sessionToken!, name);
      return response({ renamed: true });
    }
    if (path === "team/revoke-invite") {
      const { email } = z.object({ email: z.email().max(254) }).parse(body);
      revokeInvite(sessionToken!, email);
      return response({ revoked: true });
    }
    if (path === "team/invite") {
      const { email, role } = z
        .object({
          email: z.email().max(254),
          role: z.enum(["admin", "editor", "viewer"]),
        })
        .parse(body);
      return response({ invitation: inviteMember(sessionToken!, email, role) });
    }
    if (path === "team/accept") {
      const { invitation } = z
        .object({ invitation: z.string().regex(/^[a-f0-9]{64}$/) })
        .parse(body);
      acceptInvite(sessionToken!, invitation);
      return response({ joined: true });
    }
    if (path === "team/member") {
      const { userId, role } = z
        .object({
          userId: z.string().uuid(),
          role: z.enum(["admin", "editor", "viewer", "remove"]),
        })
        .parse(body);
      changeMember(sessionToken!, userId, role);
      return response({ updated: true });
    }
    if (path === "team/transfer") {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(body);
      transferOwnership(sessionToken!, userId);
      return response({ transferred: true });
    }
    if (path === "recovery/create") {
      if (who)
        return response(
          {
            error:
              "Use your verified sign-in to recover this workspace; capability recovery is disabled for teams.",
          },
          403,
        );
      return response({ code: createRecoveryCode(tenant), expiresInDays: 90 });
    }
    if (path === "audience/invite") {
      if (who) requireRole(sessionToken, ["owner", "admin"]);
      const { businessId } = z
        .object({ businessId: z.string().uuid() })
        .parse(body);
      if (!get(tenant, "business", businessId))
        return response({ error: "Business not found." }, 404);
      return response({ invitation: createAudienceInvite(tenant, businessId) });
    }
    if (path === "audience/preview") {
      const { invitation } = z
        .object({ invitation: z.string().regex(/^[a-f0-9]{64}$/) })
        .parse(body);
      const invite = audienceInvite(invitation);
      return invite
        ? response(invite)
        : response({ error: "Invitation expired or not found." }, 404);
    }
    if (path === "audience/contribute") {
      const input = AudienceContribution.parse(body);
      const participant = verifiedParticipant(sessionToken!);
      const invite = audienceInvite(input.invitation);
      if (
        invite &&
        db()
          .prepare(
            "SELECT 1 FROM records r JOIN memberships m ON m.workspace=r.tenant WHERE r.id=? AND m.user=?",
          )
          .get(invite.businessId, who!.id)
      )
        return response(
          {
            error: "Team members cannot count as their own business audience.",
          },
          403,
        );
      const saved = contributeAudience(
        participant,
        input.invitation,
        input.categories,
      );
      return saved
        ? response(saved)
        : response({ error: "Invitation expired or not found." }, 404);
    }
    if (path === "audience/withdraw") {
      const { businessId } = z
        .object({ businessId: z.string().uuid().optional() })
        .parse(body);
      withdrawAudience(tenant, businessId);
      if (who) withdrawAudience(verifiedParticipant(sessionToken!), businessId);
      return response({ withdrawn: true });
    }
    if (path === "review") {
      const input = ReviewInput.parse(body.input);
      const a = get<Analysis>(tenant, "analysis", input.analysisId);
      if (!a) return response({ error: "Analysis not found." }, 404);
      const id = crypto.randomUUID();
      const review = {
        ...input,
        id,
        businessId: a.businessId,
        createdAt: new Date().toISOString(),
      };
      put(tenant, "review", a.businessId, review);
      return response(review);
    }
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
      if (!reserveModelCall(Number(process.env.MODEL_CALLS_PER_DAY || 40)))
        throw new QlooError(
          "RATE",
          "The daily AI allowance is exhausted. Structured editing remains available.",
        );
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
      if (
        useModel &&
        !baseline &&
        !reserveModelCall(Number(process.env.MODEL_CALLS_PER_DAY || 40))
      )
        throw new QlooError(
          "RATE",
          "The daily AI allowance is exhausted. Run without the AI advisor.",
        );
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
    if (err instanceof RequestBodyTooLargeError)
      return response({ error: err.message }, 413);
    if (err instanceof AccessError)
      return response({ error: err.message }, err.status);
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
