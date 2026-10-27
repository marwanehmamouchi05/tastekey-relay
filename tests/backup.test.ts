import { it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
it("online backup restores committed WAL records and refuses to overwrite a snapshot", () => {
  const dir = mkdtempSync(join(tmpdir(), "tastekey-backup-")),
    src = join(dir, "source.db"),
    dest = join(dir, "backup.db");
  const db = new DatabaseSync(src);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE sample(id TEXT); INSERT INTO sample VALUES ('committed');",
  );
  execFileSync(process.execPath, ["scripts/backup.mjs", src, dest], {
    stdio: "pipe",
  });
  db.exec("INSERT INTO sample VALUES ('later');");
  const restored = new DatabaseSync(dest, { readOnly: true });
  expect(restored.prepare("SELECT id FROM sample").all()).toEqual([
    { id: "committed" },
  ]);
  expect(() =>
    execFileSync(process.execPath, ["scripts/backup.mjs", src, dest], {
      stdio: "pipe",
    }),
  ).toThrow();
  restored.close();
  db.close();
});
