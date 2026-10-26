import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  Category,
  EntitySchema,
  type Entity,
  type QlooEvidence,
} from "../shared-types";
const exec = promisify(execFile);
const cache = new Map<string, { at: number; data: QlooEvidence }>();
let active = 0;
export class QlooError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function binPath() {
  let dir = process.cwd();
  while (true) {
    const path = join(dir, "node_modules/@qloo/qloo-harness/dist/bin.js");
    if (existsSync(path)) return path;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new QlooError(
    "UNAVAILABLE",
    "Qloo harness is not installed on this server.",
  );
}
let statusCache: { value: boolean; expires: number } | undefined;
let statusPending: Promise<boolean> | undefined;
export async function configured(): Promise<boolean> {
  if (statusCache && statusCache.expires > Date.now()) return statusCache.value;
  statusPending ??= readConfiguration()
    .then((value) => {
      statusCache = { value, expires: Date.now() + 30000 };
      return value;
    })
    .finally(() => {
      statusPending = undefined;
    });
  return statusPending;
}
async function readConfiguration() {
  try {
    const { stdout } = await exec(
      process.execPath,
      [binPath(), "setup", "--status"],
      { timeout: 10000, maxBuffer: 32768 },
    );
    return !stdout.includes("no API credential");
  } catch {
    return false;
  }
}
export function normalizeEntities(raw: unknown, category: Category): Entity[] {
  if (!raw || typeof raw !== "object")
    throw new QlooError(
      "INVALID_RESPONSE",
      "Qloo returned an invalid response.",
    );
  const obj = raw as Record<string, any>;
  // qloo api --json formats an entity array; raw REST fixtures use results.
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(obj.results)
      ? obj.results
      : obj.results?.entities;
  if (!Array.isArray(list))
    throw new QlooError(
      "INVALID_RESPONSE",
      "Qloo response did not contain an entity list. No substitute data was generated.",
    );
  return list.slice(0, 20).map((e: any) => {
    const subtype = String(e.subtype ?? "").replace("urn:entity:", "");
    return EntitySchema.parse({
      id: e.entity_id ?? e.id,
      name: e.name,
      category: Category.safeParse(subtype).success ? subtype : category,
      affinity:
        typeof (e.affinity ?? e.query?.affinity) === "number"
          ? (e.affinity ?? e.query.affinity)
          : undefined,
      description:
        typeof e.properties?.description === "string"
          ? e.properties.description.slice(0, 3000)
          : undefined,
      explainability:
        e.query?.explainability === undefined
          ? undefined
          : JSON.stringify(e.query.explainability).slice(0, 4000),
      tags: Array.isArray(e.tags)
        ? e.tags
            .map((t: any) => String(t.name ?? t.id ?? ""))
            .filter(Boolean)
            .slice(0, 20)
        : [],
    });
  });
}
export async function callQloo(
  tool: "search" | "insights",
  inputs: Record<string, string>,
  category: Category,
): Promise<QlooEvidence> {
  const key = JSON.stringify({ tool, inputs, category });
  const found = cache.get(key);
  if (found && Date.now() - found.at < 300000)
    return { ...found.data, cached: true };
  if (active >= 2)
    throw new QlooError(
      "BUSY",
      "Two Qloo requests are already running. Try again shortly.",
    );
  active++;
  try {
    const args = [
      "api",
      tool,
      "--type",
      `urn:entity:${category}`,
      "--take",
      tool === "search" ? "5" : "12",
      "--json",
    ];
    if (tool === "search") args.push("--query", inputs.query);
    else {
      if (inputs.entities) args.push("--signal-entities", inputs.entities);
      if (inputs.city) args.push("--signal-location", inputs.city);
      args.push("--params", JSON.stringify({ "feature.explainability": true }));
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { stdout } = await exec(process.execPath, [binPath(), ...args], {
          timeout: 25000,
          maxBuffer: 2 * 1024 * 1024,
          windowsHide: true,
          env: { ...process.env, NO_COLOR: "1" },
        });
        const entities = normalizeEntities(JSON.parse(stdout), category);
        const data: QlooEvidence = {
          id: crypto.randomUUID(),
          source: "qloo",
          tool: `qloo api ${tool}`,
          inputs,
          entities,
          at: new Date().toISOString(),
          cached: false,
        };
        if (cache.size >= 150) cache.delete(cache.keys().next().value!);
        cache.set(key, { at: Date.now(), data });
        return data;
      } catch (error) {
        if (error instanceof QlooError) throw error;
        const err = error as {
          stderr?: string;
          stdout?: string;
          killed?: boolean;
        };
        const msg = `${err.stderr ?? ""} ${err.stdout ?? ""}`;
        if (/api key|credential|authentication|unauthorized|401|403/i.test(msg))
          throw new QlooError(
            "AUTH",
            "Qloo access is unavailable. Configure the event-issued credential on the server.",
          );
        if (/429|rate.limit|quota/i.test(msg))
          throw new QlooError(
            "QUOTA",
            "Qloo quota or rate limit reached. Please wait before retrying.",
          );
        if (attempt === 0 && /50[234]|ECONNRESET/i.test(msg)) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        throw new QlooError(
          err.killed ? "TIMEOUT" : "UPSTREAM",
          err.killed
            ? "Qloo timed out after 25 seconds. Try again."
            : "Qloo could not complete this request. No live insights were generated. Check server configuration and category coverage.",
        );
      }
    }
    throw new QlooError("UPSTREAM", "Qloo unavailable.");
  } finally {
    active--;
  }
}
