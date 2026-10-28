import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { aggregateMinimum } from "../../../packages/privacy-engine";
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
    instance.exec(`
      CREATE TABLE IF NOT EXISTS session_tenants (token TEXT PRIMARY KEY, tenant TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS recovery_codes (digest TEXT PRIMARY KEY, tenant TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audience_invites (digest TEXT PRIMARY KEY, owner TEXT NOT NULL, business TEXT NOT NULL UNIQUE, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audience_contributions (business TEXT NOT NULL, participant TEXT NOT NULL, categories TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY (business, participant));
      CREATE TABLE IF NOT EXISTS model_usage (day TEXT PRIMARY KEY, calls INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS auth_users (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL, email TEXT NOT NULL, home TEXT NOT NULL, UNIQUE(issuer,subject));
      CREATE TABLE IF NOT EXISTS auth_workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS memberships (workspace TEXT NOT NULL, user TEXT NOT NULL, role TEXT NOT NULL, PRIMARY KEY(workspace,user));
      CREATE TABLE IF NOT EXISTS auth_sessions (token TEXT PRIMARY KEY, user TEXT NOT NULL, workspace TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS oidc_transactions (digest TEXT PRIMARY KEY, browser TEXT NOT NULL, data TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS team_invites (digest TEXT PRIMARY KEY, workspace TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS verified_audience (participant TEXT PRIMARY KEY, user TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, workspace TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, at INTEGER NOT NULL);
    `);
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
  const valid = db()
    .prepare("SELECT token FROM sessions WHERE token=? AND expires>?")
    .get(tenant, Date.now())
    ? tenant
    : null;
  if (!valid) return null;
  const signed = db()
    .prepare("SELECT user,workspace,expires FROM auth_sessions WHERE token=?")
    .get(tenant) as
    { user: string; workspace: string; expires: number } | undefined;
  if (signed) {
    if (
      signed.expires <= Date.now() ||
      !db()
        .prepare("SELECT 1 FROM memberships WHERE workspace=? AND user=?")
        .get(signed.workspace, signed.user)
    )
      return null;
    return signed.workspace;
  }
  const anonymous =
    (
      db()
        .prepare("SELECT tenant FROM session_tenants WHERE token=?")
        .get(tenant) as { tenant: string } | undefined
    )?.tenant || tenant;
  // Once claimed, a workspace cannot be opened with old capability/recovery tokens.
  return db().prepare("SELECT 1 FROM auth_workspaces WHERE id=?").get(anonymous)
    ? null
    : anonymous;
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
    reviews: list(tenant, "review"),
    offers: list(tenant, "offer"),
    integrations: list(tenant, "embed"),
  };
}
export function deleteWorkspace(tenant: string) {
  db()
    .prepare(
      "DELETE FROM audience_contributions WHERE business IN (SELECT id FROM records WHERE tenant=? AND kind=?) OR participant=?",
    )
    .run(tenant, "business", tenant);
  db().prepare("DELETE FROM audience_invites WHERE owner=?").run(tenant);
  db().prepare("DELETE FROM recovery_codes WHERE tenant=?").run(tenant);
  revokeSessions(tenant);
  db().prepare("DELETE FROM records WHERE tenant=?").run(tenant);
  db().prepare("DELETE FROM sessions WHERE token=?").run(tenant);
  db()
    .prepare(
      "DELETE FROM sessions WHERE token IN (SELECT token FROM auth_sessions WHERE workspace=?)",
    )
    .run(tenant);
  db().prepare("DELETE FROM auth_sessions WHERE workspace=?").run(tenant);
  for (const table of ["memberships", "team_invites", "audit_events"])
    db().prepare(`DELETE FROM ${table} WHERE workspace=?`).run(tenant);
  db().prepare("DELETE FROM auth_workspaces WHERE id=?").run(tenant);
}
export function revokeSessions(tenant: string) {
  db()
    .prepare(
      "DELETE FROM sessions WHERE token=? OR token IN (SELECT token FROM session_tenants WHERE tenant=?)",
    )
    .run(tenant, tenant);
  db().prepare("DELETE FROM session_tenants WHERE tenant=?").run(tenant);
}
export function createRecoveryCode(tenant: string) {
  if (db().prepare("SELECT 1 FROM auth_workspaces WHERE id=?").get(tenant))
    throw new Error("Use your verified sign-in to recover a team workspace.");
  const code = randomBytes(32).toString("hex");
  db().prepare("DELETE FROM recovery_codes WHERE tenant=?").run(tenant);
  db()
    .prepare("INSERT INTO recovery_codes VALUES (?,?,?)")
    .run(hash(code), tenant, Date.now() + 90 * 86400000);
  return code;
}
export function recoverWorkspace(code: string) {
  if (!/^[a-f0-9]{64}$/.test(code)) return null;
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const row = conn
      .prepare("SELECT tenant FROM recovery_codes WHERE digest=? AND expires>?")
      .get(hash(code), Date.now()) as { tenant: string } | undefined;
    if (!row) {
      conn.exec("COMMIT");
      return null;
    }
    if (
      conn.prepare("SELECT 1 FROM auth_workspaces WHERE id=?").get(row.tenant)
    ) {
      conn.exec("COMMIT");
      return null;
    }
    conn.prepare("DELETE FROM recovery_codes WHERE tenant=?").run(row.tenant);
    revokeSessions(row.tenant);
    const token = newSession();
    conn
      .prepare("INSERT INTO session_tenants VALUES (?,?)")
      .run(hash(token), row.tenant);
    // Consent follows the original participant pseudonym, not the browser doing recovery.
    conn.exec("COMMIT");
    return token;
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}
export function createAudienceInvite(owner: string, business: string) {
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("DELETE FROM audience_invites WHERE business=? AND owner=?")
    .run(business, owner);
  db()
    .prepare("INSERT INTO audience_invites VALUES (?,?,?,?)")
    .run(hash(token), owner, business, Date.now() + 30 * 86400000);
  return token;
}
export function audienceInvite(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = db()
    .prepare(
      "SELECT owner,business FROM audience_invites WHERE digest=? AND expires>?",
    )
    .get(hash(token), Date.now()) as
    { owner: string; business: string } | undefined;
  if (!row) return null;
  const b = get<Business>(row.owner, "business", row.business);
  return b ? { businessId: b.id, name: b.name } : null;
}
export function contributeAudience(
  participant: string,
  invitation: string,
  categories: string[],
) {
  const invite = audienceInvite(invitation);
  if (!invite) return null;
  db()
    .prepare(
      "INSERT INTO audience_contributions VALUES (?,?,?,?) ON CONFLICT(business,participant) DO UPDATE SET categories=excluded.categories, expires=excluded.expires",
    )
    .run(
      invite.businessId,
      participant,
      JSON.stringify(categories),
      Date.now() + 30 * 86400000,
    );
  return invite;
}
export function ownContributions(participant: string) {
  return (
    db()
      .prepare(
        "SELECT c.business,c.categories,c.expires, r.data FROM audience_contributions c JOIN records r ON r.id=c.business AND r.kind='business' WHERE c.participant=? AND c.expires>? ",
      )
      .all(participant, Date.now()) as any[]
  ).map((r) => ({
    businessId: r.business,
    name: JSON.parse(r.data).name,
    categories: JSON.parse(r.categories),
    expiresAt: new Date(r.expires).toISOString(),
  }));
}
export function withdrawAudience(participant: string, business?: string) {
  if (business)
    db()
      .prepare(
        "DELETE FROM audience_contributions WHERE participant=? AND business=?",
      )
      .run(participant, business);
  else
    db()
      .prepare("DELETE FROM audience_contributions WHERE participant=?")
      .run(participant);
}
export function audienceReport(business: string) {
  const rows = db()
    .prepare(
      "SELECT categories FROM audience_contributions c JOIN verified_audience v ON v.participant=c.participant WHERE business=? AND expires>?",
    )
    .all(business, Date.now()) as { categories: string }[];
  if (rows.length < aggregateMinimum)
    return { suppressed: true, minimum: aggregateMinimum, groups: [] };
  const counts: Record<string, number> = {};
  for (const r of rows)
    for (const category of JSON.parse(r.categories))
      counts[category] = (counts[category] || 0) + 1;
  return {
    suppressed: false,
    minimum: aggregateMinimum,
    groups: Object.entries(counts)
      .filter(
        ([, n]) =>
          n >= aggregateMinimum &&
          (rows.length - n === 0 || rows.length - n >= aggregateMinimum),
      )
      .map(([category, count]) => ({ category, count })),
  };
}
export function reserveModelCall(max = 40) {
  if (!Number.isInteger(max) || max < 1) return false;
  const day = new Date().toISOString().slice(0, 10);
  return (
    db()
      .prepare(
        "INSERT INTO model_usage VALUES (?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1 WHERE calls<? RETURNING calls",
      )
      .get(day, max) !== undefined
  );
}
