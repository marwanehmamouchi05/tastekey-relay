// Run inside the application container. Outputs presence/health, never secret values or records.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const requiredTables = [
  "sessions",
  "records",
  "auth_users",
  "auth_workspaces",
  "memberships",
  "auth_sessions",
  "oidc_transactions",
  "team_invites",
  "verified_audience",
  "audit_events",
  "model_usage",
];
const report = {
  at: new Date().toISOString(),
  release: /^[a-f0-9]{40}$/.test(process.env.APP_RELEASE || "")
    ? process.env.APP_RELEASE
    : "unknown",
  environmentPresent: Object.fromEntries(
    [
      "APP_ORIGIN",
      "TASTEKEY_DB_PATH",
      "OIDC_ISSUER",
      "OIDC_CLIENT_ID",
      "MODEL_PROVIDER",
      "MODEL_REGION",
      "MODEL_NAME",
      "MODEL_AWS_ACCESS_KEY_ID",
      "MODEL_AWS_SECRET_ACCESS_KEY",
    ].map((k) => [k, Boolean(process.env[k])]),
  ),
  httpsOrigin: process.env.APP_ORIGIN?.startsWith("https://") === true,
  databaseExists: existsSync(
    process.env.TASTEKEY_DB_PATH || "data/tastekey.db",
  ),
  modelAccessExpires: process.env.MODEL_ACCESS_EXPIRES || "not declared",
  limits: {
    qlooRequestsPerHour: Number(process.env.QLOO_REQUESTS_PER_HOUR || 100),
    modelCallsPerDay: Number(process.env.MODEL_CALLS_PER_DAY || 40),
  },
  sourceSha256: Object.fromEntries(
    [
      "apps/web/components/personal.tsx",
      "apps/web/components/studio.tsx",
      "packages/qloo-adapter/index.ts",
    ].map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  ),
};
const db = new DatabaseSync(
  process.env.TASTEKEY_DB_PATH || "data/tastekey.db",
  { readOnly: true, timeout: 5000 },
);
try {
  const tables = new Set(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name),
  );
  report.database = {
    quickCheck: Object.values(db.prepare("PRAGMA quick_check").get())[0],
    journalMode: Object.values(db.prepare("PRAGMA journal_mode").get())[0],
    schemaMarker: Object.values(db.prepare("PRAGMA user_version").get())[0],
    additiveSchemaTables: Object.fromEntries(
      requiredTables.map((t) => [t, tables.has(t)]),
    ),
  };
} finally {
  db.close();
}
console.log(JSON.stringify(report, null, 2));
if (
  !report.databaseExists ||
  report.database.quickCheck !== "ok" ||
  Object.values(report.database.additiveSchemaTables).some((v) => !v)
)
  process.exitCode = 1;
