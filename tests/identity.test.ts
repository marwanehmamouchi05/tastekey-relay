import { beforeAll, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  db,
  newSession,
  tenantFor,
  put,
  get,
  createRecoveryCode,
  recoverWorkspace,
  createAudienceInvite,
  contributeAudience,
  audienceReport,
  withdrawAudience,
  deleteWorkspace,
} from "../apps/web/lib/db";
import {
  completeSignIn,
  identity,
  requireRole,
  assertWrite,
  inviteMember,
  acceptInvite,
  changeMember,
  transferOwnership,
  verifiedParticipant,
  signOut,
  digest,
  renameWorkspace,
  revokeInvite,
  accountInfo,
} from "../apps/web/lib/identity";
beforeAll(() => {
  process.env.TASTEKEY_DB_PATH = join(
    mkdtempSync(join(tmpdir(), "tastekey-identity-")),
    "test.db",
  );
});
const login = (
  sub = crypto.randomUUID(),
  email = sub + "@example.org",
  guest?: string,
) =>
  completeSignIn(
    { iss: "https://issuer.example", sub, email, email_verified: true },
    guest,
  );
it("rejects unverified identities without creating an account", () => {
  expect(() =>
    completeSignIn({
      iss: "https://issuer.example",
      sub: "bad",
      email: "bad@example.org",
      email_verified: false,
    }),
  ).toThrow("Verify your email");
  expect(
    db().prepare("SELECT 1 FROM auth_users WHERE subject=?").get("bad"),
  ).toBeUndefined();
});
it("claim preserves private records but revokes capability tokens and recovery codes", () => {
  const old = newSession(),
    tenant = tenantFor(old)!;
  put(tenant, "business", "owned", {
    id: "owned",
    name: "Private fixture",
  } as any);
  const code = createRecoveryCode(tenant);
  const token = login("claim", "claim@example.org", tenant);
  expect(identity(token)?.role).toBe("owner");
  expect(tenantFor(token)).toBe(tenant);
  expect(get<any>(tenant, "business", "owned")?.name).toBe("Private fixture");
  expect(tenantFor(old)).toBeNull();
  expect(recoverWorkspace(code)).toBeNull();
  expect(() => createRecoveryCode(tenant)).toThrow("verified sign-in");
});
it("sign-in is stable across browsers without linking unrelated accounts by matching email", () => {
  const a = login("stable", "same@example.org"),
    b = login("stable", "same@example.org"),
    other = login("separate-sub", "same@example.org");
  expect(identity(a)?.id).toBe(identity(b)?.id);
  expect(identity(a)?.workspace).toBe(identity(b)?.workspace);
  expect(identity(other)?.id).not.toBe(identity(a)?.id);
  signOut(a);
  expect(identity(a)).toBeNull();
  expect(identity(b)).not.toBeNull();
});
it("email-bound invitation rejects the wrong account, expires, and can be used once", () => {
  const owner = login("invite-owner"),
    invitee = login("invitee", "invitee@example.org"),
    wrong = login("wrong", "wrong@example.org");
  const code = inviteMember(owner, "invitee@example.org", "viewer");
  expect(() => acceptInvite(wrong, code)).toThrow("different verified email");
  acceptInvite(invitee, code);
  expect(identity(invitee)?.workspace).toBe(identity(owner)?.workspace);
  expect(identity(invitee)?.role).toBe("viewer");
  expect(() => acceptInvite(invitee, code)).toThrow("invalid");
  const expired = inviteMember(owner, "invitee@example.org", "editor");
  db()
    .prepare("UPDATE team_invites SET expires=0 WHERE digest=?")
    .run(digest(expired));
  expect(() => acceptInvite(invitee, expired)).toThrow("expired");
});
it("viewer is read-only; editors cannot administer; administrators cannot escalate or demote owners", () => {
  const owner = login("roles-owner"),
    viewer = login("roles-viewer"),
    editor = login("roles-editor"),
    admin = login("roles-admin");
  for (const [token, sub, role] of [
    [viewer, "roles-viewer", "viewer"],
    [editor, "roles-editor", "editor"],
    [admin, "roles-admin", "admin"],
  ] as const) {
    acceptInvite(token, inviteMember(owner, sub + "@example.org", role));
  }
  expect(() => assertWrite(viewer)).toThrow("role");
  expect(() => assertWrite(editor)).not.toThrow();
  expect(() => assertWrite(editor, true)).toThrow("role");
  expect(() => inviteMember(editor, "new@example.org", "viewer")).toThrow(
    "role",
  );
  expect(() => inviteMember(admin, "new@example.org", "admin")).toThrow(
    "Only the owner",
  );
  expect(() => changeMember(admin, identity(owner)!.id, "remove")).toThrow(
    "owner",
  );
  expect(() => changeMember(admin, identity(editor)!.id, "admin")).toThrow(
    "Only the owner",
  );
  expect(() => requireRole(viewer, ["owner"])).toThrow("role");
});
it("revocation and expiry invalidate access immediately, without falling back to an anonymous owner session", () => {
  const owner = login("revoke-owner"),
    member = login("revoke-member");
  acceptInvite(
    member,
    inviteMember(owner, "revoke-member@example.org", "editor"),
  );
  changeMember(owner, identity(member)!.id, "remove");
  expect(identity(member)).toBeNull();
  expect(tenantFor(member)).toBeNull();
  const expiring = login("expire-member");
  db()
    .prepare("UPDATE auth_sessions SET expires=0 WHERE token=?")
    .run(digest(expiring));
  expect(tenantFor(expiring)).toBeNull();
  expect(identity(expiring)).toBeNull();
});
it("ownership transfer keeps one owner and only the owner may delete a shared workspace", () => {
  const owner = login("transfer-owner"),
    member = login("transfer-member");
  acceptInvite(
    member,
    inviteMember(owner, "transfer-member@example.org", "admin"),
  );
  transferOwnership(owner, identity(member)!.id);
  expect(identity(owner)?.role).toBe("admin");
  expect(identity(member)?.role).toBe("owner");
  expect(() => transferOwnership(owner, identity(member)!.id)).toThrow("role");
  expect(() => assertWrite(owner, true)).toThrow("role");
  const workspace = tenantFor(member)!;
  deleteWorkspace(workspace);
  expect(tenantFor(owner)).toBeNull();
  expect(tenantFor(member)).toBeNull();
});
it("verified audience deduplicates accounts across sessions and excludes anonymous contributions from disclosure", () => {
  const owner = tenantFor(newSession())!,
    business = crypto.randomUUID();
  put(owner, "business", business, {
    id: business,
    name: "Synthetic identity test",
  } as any);
  const invitation = createAudienceInvite(owner, business);
  for (let i = 0; i < 15; i++)
    contributeAudience(tenantFor(newSession())!, invitation, ["movie"]);
  expect(audienceReport(business).suppressed).toBe(true);
  const participants = Array.from({ length: 10 }, (_, i) =>
    verifiedParticipant(login("audience-" + i)),
  );
  for (const p of participants) contributeAudience(p, invitation, ["movie"]);
  const again = verifiedParticipant(login("audience-0"));
  expect(again).toBe(participants[0]);
  contributeAudience(again, invitation, ["movie"]);
  expect(audienceReport(business)).toMatchObject({
    suppressed: false,
    groups: [{ category: "movie", count: 10 }],
  });
  withdrawAudience(again, business);
  expect(audienceReport(business).suppressed).toBe(true);
});
it("preserves a returning account's new private drafts and revokes their old capabilities", () => {
  const original = login("returning-draft");
  const first = tenantFor(original)!;
  const guest = newSession(),
    draft = tenantFor(guest)!;
  put(draft, "business", "draft", {
    id: "draft",
    name: "Private draft",
  } as any);
  const signedIn = login(
    "returning-draft",
    "returning-draft@example.org",
    draft,
  );
  expect(tenantFor(signedIn)).toBe(draft);
  expect(tenantFor(guest)).toBeNull();
  expect(get(draft, "business", "draft")).toBeDefined();
  expect(accountInfo(signedIn).workspaces.map((w) => w.id)).toContain(first);
});
it("lets managers name workspaces and revoke invitations without escalating administrator access", () => {
  const owner = login("invite-revoke-owner"),
    admin = login("invite-revoke-admin");
  acceptInvite(
    admin,
    inviteMember(owner, "invite-revoke-admin@example.org", "admin"),
  );
  renameWorkspace(admin, "Community cinema");
  expect(
    accountInfo(owner).workspaces.find((w) => w.id === tenantFor(owner))?.name,
  ).toBe("Community cinema");
  const member = login("invite-revoked-member");
  const invitation = inviteMember(
    owner,
    "invite-revoked-member@example.org",
    "viewer",
  );
  revokeInvite(admin, "invite-revoked-member@example.org");
  expect(() => acceptInvite(member, invitation)).toThrow();
  inviteMember(owner, "pending-admin@example.org", "admin");
  expect(() => revokeInvite(admin, "pending-admin@example.org")).toThrow(
    "Only the owner",
  );
});
