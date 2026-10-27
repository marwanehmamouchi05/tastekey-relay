import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, mkdirSync, chmodSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
// Online SQLite backup includes committed WAL data; never copy a live .db file alone.
const source = resolve(
  process.argv[2] || process.env.TASTEKEY_DB_PATH || "data/tastekey.db",
);
const target = resolve(process.argv[3] || "");
if (
  !process.argv[3] ||
  source === target ||
  !existsSync(source) ||
  existsSync(target)
)
  throw new Error(
    "Provide an existing source and a new, distinct backup file.",
  );
process.umask(0o077);
mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(source, { readOnly: true, timeout: 5000 });
try {
  await backup(db, target);
  const copy = new DatabaseSync(target, { readOnly: true });
  const check = copy.prepare("PRAGMA integrity_check").get();
  copy.close();
  if (check.integrity_check !== "ok")
    throw new Error("Backup integrity check failed.");
  chmodSync(target, 0o600);
  console.log(JSON.stringify({ backup: "created", integrity: "ok" }));
} catch (e) {
  if (existsSync(target)) rmSync(target);
  throw e;
} finally {
  db.close();
}
