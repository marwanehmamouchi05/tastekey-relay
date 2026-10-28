import { beforeAll, beforeEach, it, expect, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { db, newSession, tenantFor } from "../apps/web/lib/db";
import { identity, digest } from "../apps/web/lib/identity";
const sdk = vi.hoisted(() => ({ discovery: vi.fn(), grant: vi.fn() }));
vi.mock("openid-client", () => ({
  discovery: sdk.discovery,
  enableNonRepudiationChecks: () => undefined,
  authorizationCodeGrant: sdk.grant,
  None: () => undefined,
  ClientSecretBasic: () => undefined,
  randomPKCECodeVerifier: () => crypto.randomUUID(),
  randomState: () => crypto.randomUUID(),
  randomNonce: () => crypto.randomUUID(),
  calculatePKCECodeChallenge: async () => "synthetic-challenge",
  buildAuthorizationUrl: (_config: unknown, p: Record<string, string>) => {
    const u = new URL("https://provider.example/authorize");
    for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
    return u;
  },
}));
import { authRoute } from "../apps/web/lib/auth";
beforeAll(() => {
  process.env.TASTEKEY_DB_PATH = join(
    mkdtempSync(join(tmpdir(), "tastekey-oidc-")),
    "test.db",
  );
  process.env.APP_ORIGIN = "https://app.example";
  process.env.OIDC_ISSUER = "https://provider.example";
  process.env.OIDC_CLIENT_ID = "synthetic-client";
  sdk.discovery.mockResolvedValue({});
});
beforeEach(() => {
  sdk.grant.mockReset();
  sdk.grant.mockResolvedValue({
    claims: () => ({
      iss: "https://provider.example",
      sub: "verified-fixture",
      email: "verified@example.org",
      email_verified: true,
    }),
  });
});
async function start(returnTo = "/account") {
  const guest = newSession();
  const res = (await authRoute(
    new NextRequest(
      "https://app.example/api/auth/start?returnTo=" +
        encodeURIComponent(returnTo),
      { headers: { Cookie: "tastekey_session=" + guest } },
    ),
    "auth/start",
  ))!;
  const url = new URL(res.headers.get("location")!);
  const browser = res.cookies.get("tastekey_oidc")!.value;
  return { state: url.searchParams.get("state")!, browser, guest, url };
}
function callback(state: string, browser: string) {
  return new NextRequest(
    "https://app.example/api/auth/callback?code=synthetic-code&state=" + state,
    { headers: { Cookie: "tastekey_oidc=" + browser } },
  );
}
it("authorization uses PKCE, nonce, one-use server state and only approved return paths", async () => {
  const flow = await start("https://evil.example/");
  expect(flow.url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(flow.url.searchParams.get("nonce")).toBeTruthy();
  expect(flow.url.searchParams.get("scope")).toBe("openid email");
  const row = db()
    .prepare("SELECT data FROM oidc_transactions WHERE digest=?")
    .get(digest(flow.state)) as { data: string };
  expect(JSON.parse(row.data).returnTo).toBe("/account");
  expect(row.data).not.toContain(flow.guest);
});
it("callback binding rejects a different browser before token exchange", async () => {
  const flow = await start();
  const res = (await authRoute(
    callback(flow.state, "wrong-browser"),
    "auth/callback",
  ))!;
  expect(res.headers.get("location")).toContain("auth=failed");
  expect(sdk.grant).not.toHaveBeenCalled();
  expect(
    db()
      .prepare("SELECT 1 FROM oidc_transactions WHERE digest=?")
      .get(digest(flow.state)),
  ).toBeTruthy();
});
it("validated callback rotates the session, checks nonce/state, and cannot be replayed", async () => {
  const flow = await start("/studio/team");
  const res = (await authRoute(
    callback(flow.state, flow.browser),
    "auth/callback",
  ))!;
  expect(res.headers.get("location")).toBe("https://app.example/studio/team");
  const token = res.cookies.get("tastekey_session")!.value;
  expect(identity(token)?.email).toBe("verified@example.org");
  expect(tenantFor(flow.guest)).toBeNull();
  expect(sdk.grant.mock.calls[0][2]).toMatchObject({
    expectedState: flow.state,
    idTokenExpected: true,
  });
  expect(sdk.grant.mock.calls[0][2].expectedNonce).toBeTruthy();
  expect(sdk.grant.mock.calls[0][2].pkceCodeVerifier).toBeTruthy();
  sdk.grant.mockClear();
  const replay = (await authRoute(
    callback(flow.state, flow.browser),
    "auth/callback",
  ))!;
  expect(replay.cookies.get("tastekey_session")).toBeUndefined();
  expect(sdk.grant).not.toHaveBeenCalled();
});
it("provider token/signature validation errors never establish a session", async () => {
  const flow = await start();
  sdk.grant.mockRejectedValue(new Error("Invalid provider signature"));
  const res = (await authRoute(
    callback(flow.state, flow.browser),
    "auth/callback",
  ))!;
  expect(res.cookies.get("tastekey_session")).toBeUndefined();
  expect(res.headers.get("location")).toContain("auth=failed");
});
it("unverified email claims and wrong issuer claims cannot establish a verified identity", async () => {
  for (const claims of [
    {
      iss: "https://provider.example",
      sub: "unverified",
      email: "unverified@example.org",
      email_verified: false,
    },
    {
      iss: "https://other.example",
      sub: "wrongissuer",
      email: "wrong@example.org",
      email_verified: true,
    },
  ]) {
    const flow = await start();
    sdk.grant.mockResolvedValue({ claims: () => claims });
    const res = (await authRoute(
      callback(flow.state, flow.browser),
      "auth/callback",
    ))!;
    expect(res.cookies.get("tastekey_session")).toBeUndefined();
    expect(res.headers.get("location")).toContain("auth=failed");
  }
});
it("expired flow is refused before the provider is called", async () => {
  const flow = await start();
  db()
    .prepare("UPDATE oidc_transactions SET expires=0 WHERE digest=?")
    .run(digest(flow.state));
  const res = (await authRoute(
    callback(flow.state, flow.browser),
    "auth/callback",
  ))!;
  expect(res.headers.get("location")).toContain("auth=failed");
  expect(sdk.grant).not.toHaveBeenCalled();
});
