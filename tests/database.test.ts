import { it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  newSession,
  tenantFor,
  put,
  get,
  workspace,
  deleteWorkspace,
} from "../apps/web/lib/db";
beforeAll(() => {
  process.env.TASTEKEY_DB_PATH = join(
    mkdtempSync(join(tmpdir(), "tastekey-test-")),
    "test.db",
  );
});
it("persists records and denies another session all business records", () => {
  const tokenA = newSession(),
    tokenB = newSession();
  const a = tenantFor(tokenA)!,
    b = tenantFor(tokenB)!;
  expect(a).not.toBe(tokenA);
  put(a, "business", "b", { id: "b", name: "Private A" } as any);
  put(a, "outcome", "b", { id: "o", actual: 10 } as any);
  expect(get<any>(a, "business", "b")?.name).toBe("Private A");
  expect(get(b, "business", "b")).toBeNull();
  expect(workspace(b).outcomes).toEqual([]);
  expect(workspace(a).outcomes[0].actual).toBe(10);
});
it("cross-tenant upsert cannot overwrite another tenant record", () => {
  const a = tenantFor(newSession())!,
    b = tenantFor(newSession())!;
  put(a, "business", "a", { id: "a", name: "Original" } as any);
  put(b, "business", "a", { id: "a", name: "Attacker" } as any);
  expect(get<any>(a, "business", "a")?.name).toBe("Original");
  expect(get(b, "business", "a")).toBeNull();
});
it("workspace deletion removes data and invalidates session", () => {
  const token = newSession(),
    tenant = tenantFor(token)!;
  put(tenant, "business", "d", { id: "d" });
  deleteWorkspace(tenant);
  expect(tenantFor(token)).toBeNull();
  expect(workspace(tenant).businesses).toEqual([]);
});
it("invalid bearer cookies cannot select arbitrary tenants", () => {
  expect(tenantFor("anything")).toBeNull();
  expect(tenantFor("a".repeat(64))).toBeNull();
});
