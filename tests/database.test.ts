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
  createRecoveryCode,
  recoverWorkspace,
  createAudienceInvite,
  contributeAudience,
  audienceReport,
  ownContributions,
  withdrawAudience,
  db,
  reserveModelCall,
} from "../apps/web/lib/db";
beforeAll(() => {
  process.env.TASTEKEY_DB_PATH = join(
    mkdtempSync(join(tmpdir(), "tastekey-test-")),
    "test.db",
  );
});
it("recovery codes are hashed, rotated, one-use, and invalidate old sessions", () => {
  const old = newSession(),
    tenant = tenantFor(old)!;
  put(tenant, "business", "recovered", {
    id: "recovered",
    name: "Saved record",
  } as any);
  const stale = createRecoveryCode(tenant),
    code = createRecoveryCode(tenant);
  expect(recoverWorkspace(stale)).toBeNull();
  expect(
    db().prepare("SELECT digest FROM recovery_codes WHERE digest=?").get(code),
  ).toBeUndefined();
  const fresh = recoverWorkspace(code)!;
  expect(tenantFor(fresh)).toBe(tenant);
  expect(tenantFor(old)).toBeNull();
  expect(get<any>(tenantFor(fresh)!, "business", "recovered")?.name).toBe(
    "Saved record",
  );
  expect(recoverWorkspace(code)).toBeNull();
  deleteWorkspace(tenant);
  expect(tenantFor(fresh)).toBeNull();
});
it("expired recovery codes never reopen records", () => {
  const tenant = tenantFor(newSession())!,
    code = createRecoveryCode(tenant);
  db()
    .prepare("UPDATE recovery_codes SET expires=0 WHERE tenant=?")
    .run(tenant);
  expect(recoverWorkspace(code)).toBeNull();
});
it("audience counts deduplicate private sessions and suppress immediately after withdrawal", () => {
  const owner = tenantFor(newSession())!,
    business = crypto.randomUUID();
  put(owner, "business", business, {
    id: business,
    name: "Synthetic audience test",
  } as any);
  const invitation = createAudienceInvite(owner, business);
  const participants = Array.from({ length: 10 }, () =>
    tenantFor(newSession())!,
  );
  for (const p of participants) contributeAudience(p, invitation, ["movie"]);
  contributeAudience(participants[0], invitation, ["movie"]);
  expect(audienceReport(business)).toMatchObject({
    suppressed: false,
    groups: [{ category: "movie", count: 10 }],
  });
  expect(ownContributions(owner)).toEqual([]);
  expect(ownContributions(participants[0])[0]).not.toHaveProperty(
    "participant",
  );
  withdrawAudience(participants[0], business);
  expect(audienceReport(business)).toMatchObject({
    suppressed: true,
    groups: [],
  });
  expect(JSON.stringify(audienceReport(business))).not.toContain(
    participants[1],
  );
  expect(ownContributions(participants[0])).toEqual([]);
});
it("expired invitations cannot collect and expired contributions cannot be reported", () => {
  const owner = tenantFor(newSession())!,
    business = crypto.randomUUID(),
    p = tenantFor(newSession())!;
  put(owner, "business", business, { id: business, name: "Expiry" } as any);
  const invitation = createAudienceInvite(owner, business);
  contributeAudience(p, invitation, ["book"]);
  db()
    .prepare("UPDATE audience_contributions SET expires=0 WHERE business=?")
    .run(business);
  expect(ownContributions(p)).toEqual([]);
  db()
    .prepare("UPDATE audience_invites SET expires=0 WHERE business=?")
    .run(business);
  expect(contributeAudience(p, invitation, ["movie"])).toBeNull();
});
it("daily model allowance persists in SQLite and cannot be bypassed with another session", () => {
  db().exec("DELETE FROM model_usage");
  expect(reserveModelCall(0)).toBe(false);
  expect(reserveModelCall(2)).toBe(true);
  newSession();
  expect(reserveModelCall(2)).toBe(true);
  expect(reserveModelCall(2)).toBe(false);
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
