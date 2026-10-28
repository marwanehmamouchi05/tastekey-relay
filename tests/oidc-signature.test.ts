import { it, expect } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import * as client from "openid-client";
const signing = generateKeyPairSync("rsa", { modulusLength: 2048 });
const wrong = generateKeyPairSync("rsa", { modulusLength: 2048 });
const issuer = "https://signed-fixture.example";
const jwk = {
  ...signing.publicKey.export({ format: "jwk" }),
  kid: "fixture",
  alg: "RS256",
  use: "sig",
};
function jwt(overrides: Record<string, unknown> = {}, badSignature = false) {
  const part = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const data =
    part({ alg: "RS256", kid: "fixture" }) +
    "." +
    part({
      iss: issuer,
      sub: "fixture-account",
      aud: "fixture-client",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
      nonce: "fixture-nonce",
      email: "fixture@example.org",
      email_verified: true,
      ...overrides,
    });
  return (
    data +
    "." +
    sign(
      "RSA-SHA256",
      Buffer.from(data),
      badSignature ? wrong.privateKey : signing.privateKey,
    ).toString("base64url")
  );
}
async function exchange(token: string) {
  const config = new client.Configuration(
    {
      issuer,
      authorization_endpoint: issuer + "/authorize",
      token_endpoint: issuer + "/token",
      jwks_uri: issuer + "/jwks",
      id_token_signing_alg_values_supported: ["RS256"],
    },
    "fixture-client",
  );
  client.enableNonRepudiationChecks(config);
  config[client.customFetch] = async (url) =>
    String(url).endsWith("/jwks")
      ? Response.json({ keys: [jwk] })
      : Response.json({
          access_token: "explicitly-synthetic-test-token",
          token_type: "Bearer",
          expires_in: 600,
          id_token: token,
        });
  return client.authorizationCodeGrant(
    config,
    new URL("https://app.example/callback?code=fixture&state=fixture-state"),
    {
      expectedState: "fixture-state",
      expectedNonce: "fixture-nonce",
      pkceCodeVerifier: "v".repeat(43),
      idTokenExpected: true,
    },
  );
}
it("real OIDC library accepts a signed token with matching issuer, audience, expiry and nonce", async () => {
  expect((await exchange(jwt())).claims()?.sub).toBe("fixture-account");
});
it("real OIDC library rejects a token signed by a different key", async () => {
  await expect(exchange(jwt({}, true))).rejects.toThrow();
});
it("real OIDC library rejects wrong issuer, audience, nonce and expired claims", async () => {
  for (const bad of [
    { iss: "https://wrong.example" },
    { aud: "wrong-client" },
    { nonce: "wrong-nonce" },
    { exp: 1 },
  ])
    await expect(exchange(jwt(bad))).rejects.toThrow();
});
