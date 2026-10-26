import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import type {
  Workspace,
  Business,
  Analysis,
  Action,
  Outcome,
} from "@tastekey/shared-types";
let instance: DatabaseSync;
export function db() {
  if (!instance) {
    const path =
      process.env.TASTEKEY_DB_PATH ||
      resolve(process.cwd(), "data/tastekey.db");
    mkdirSync(dirname(path), { recursive: true });
    instance = new DatabaseSync(path);
    instance.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, kind TEXT NOT NULL, business TEXT NOT NULL, data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS records_tenant ON records(tenant,kind,business);",
    );
  }
  return instance;
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function newSession() {
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("INSERT INTO sessions(token,expires) VALUES (?,?)")
    .run(hash(token), Date.now() + 30 * 86400000);
  return token;
}
export function tenantFor(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const tenant = hash(token);
  return db()
    .prepare("SELECT token FROM sessions WHERE token=? AND expires>?")
    .get(tenant, Date.now())
    ? tenant
    : null;
}
export function put(
  tenant: string,
  kind: string,
  business: string,
  record: { id: string },
) {
  db()
    .prepare(
      "INSERT INTO records(id,tenant,kind,business,data) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE records.tenant=excluded.tenant AND records.kind=excluded.kind",
    )
    .run(record.id, tenant, kind, business, JSON.stringify(record));
}
export function get<T>(tenant: string, kind: string, id: string): T | null {
  const row = db()
    .prepare("SELECT data FROM records WHERE tenant=? AND kind=? AND id=?")
    .get(tenant, kind, id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}
export function list<T>(tenant: string, kind: string): T[] {
  return (
    db()
      .prepare(
        "SELECT data FROM records WHERE tenant=? AND kind=? ORDER BY rowid DESC",
      )
      .all(tenant, kind) as { data: string }[]
  ).map((r) => JSON.parse(r.data));
}
export function workspace(tenant: string): Workspace {
  return {
    businesses: list<Business>(tenant, "business"),
    analyses: list<Analysis>(tenant, "analysis"),
    actions: list<Action>(tenant, "action"),
    outcomes: list<Outcome>(tenant, "outcome"),
  };
}
export function deleteWorkspace(tenant: string) {
  db().prepare("DELETE FROM records WHERE tenant=?").run(tenant);
  db().prepare("DELETE FROM sessions WHERE token=?").run(tenant);
}
