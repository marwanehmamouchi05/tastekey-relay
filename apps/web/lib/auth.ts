import * as oidc from "openid-client";
import { NextRequest, NextResponse } from "next/server";
import { db, tenantFor } from "./db";
import {
  accountInfo,
  completeSignIn,
  digest,
  signOut,
  AccessError,
} from "./identity";
export function authConfigured() {
  return Boolean(
    process.env.OIDC_ISSUER &&
    process.env.OIDC_CLIENT_ID &&
    process.env.APP_ORIGIN?.startsWith("https://"),
  );
}
let configuration: Promise<oidc.Configuration> | undefined;
async function provider() {
  if (!authConfigured())
    throw new AccessError("Secure sign-in is not configured yet.", 503);
  const issuer = new URL(process.env.OIDC_ISSUER!);
  if (issuer.protocol !== "https:" || issuer.username || issuer.password)
    throw new AccessError("Sign-in issuer must use HTTPS.", 503);
  configuration ??= oidc
    .discovery(
      issuer,
      process.env.OIDC_CLIENT_ID!,
      undefined,
      process.env.OIDC_CLIENT_SECRET
        ? oidc.ClientSecretBasic(process.env.OIDC_CLIENT_SECRET)
        : oidc.None(),
      { execute: [oidc.enableNonRepudiationChecks], timeout: 10 },
    )
    .catch((e) => {
      configuration = undefined;
      throw e;
    });
  return configuration;
}
const origin = () => process.env.APP_ORIGIN!;
export async function authRoute(
  request: NextRequest,
  path: string,
): Promise<NextResponse | null> {
  const token = request.cookies.get("tastekey_session")?.value;
  if (path === "auth/status" && request.method === "GET")
    return NextResponse.json(
      { configured: authConfigured(), ...accountInfo(token) },
      { headers: { "Cache-Control": "no-store" } },
    );
  if (path === "auth/logout" && request.method === "POST") {
    signOut(token);
    let validLogout: string | undefined;
    try {
      const logout = new URL(process.env.OIDC_LOGOUT_URL || "");
      if (logout.protocol === "https:" && !logout.username && !logout.password)
        validLogout = logout.href;
    } catch {
      /* Local sign-out still succeeds if provider logout is unavailable. */
    }
    const result = NextResponse.json({ signedOut: true, logout: validLogout });
    result.cookies.delete("tastekey_session");
    return result;
  }
  if (path === "auth/start" && request.method === "GET") {
    const config = await provider();
    const verifier = oidc.randomPKCECodeVerifier(),
      state = oidc.randomState(),
      nonce = oidc.randomNonce(),
      browser = oidc.randomState();
    const requested = request.nextUrl.searchParams.get("returnTo");
    const returnTo = ["/account", "/studio/team", "/personal/proof"].includes(
      requested || "",
    )
      ? requested!
      : "/account";
    db()
      .prepare("DELETE FROM oidc_transactions WHERE expires<=?")
      .run(Date.now());
    db()
      .prepare("INSERT INTO oidc_transactions VALUES (?,?,?,?)")
      .run(
        digest(state),
        digest(browser),
        JSON.stringify({
          verifier,
          nonce,
          returnTo,
          guest: !accountInfo(token).signedIn ? tenantFor(token) : null,
        }),
        Date.now() + 10 * 60000,
      );
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: origin() + "/api/auth/callback",
      scope: "openid email",
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: "S256",
      state,
      nonce,
    });
    const response = NextResponse.redirect(url);
    response.cookies.set("tastekey_oidc", browser, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 600,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  if (path === "auth/callback" && request.method === "GET") {
    const failed = () =>
      NextResponse.redirect(new URL("/account?auth=failed", origin()));
    let response: NextResponse;
    try {
      const state = request.nextUrl.searchParams.get("state"),
        browser = request.cookies.get("tastekey_oidc")?.value;
      if (!state || !browser || state.length > 256 || browser.length > 256)
        throw new Error("Missing callback binding");
      const row = db()
        .prepare(
          "DELETE FROM oidc_transactions WHERE digest=? AND browser=? AND expires>? RETURNING data",
        )
        .get(digest(state), digest(browser), Date.now()) as
        { data: string } | undefined;
      if (!row) throw new Error("Invalid callback binding");
      const flow = JSON.parse(row.data);
      const callback = new URL(
        "/api/auth/callback" + request.nextUrl.search,
        origin(),
      );
      const result = await oidc.authorizationCodeGrant(
        await provider(),
        callback,
        {
          pkceCodeVerifier: flow.verifier,
          expectedState: state,
          expectedNonce: flow.nonce,
          idTokenExpected: true,
        },
      );
      const claims = result.claims();
      if (
        !claims ||
        typeof claims.email !== "string" ||
        typeof claims.sub !== "string" ||
        claims.iss !== process.env.OIDC_ISSUER
      )
        throw new Error("Invalid verified identity");
      const session = completeSignIn(
        {
          iss: claims.iss,
          sub: claims.sub,
          email: claims.email,
          email_verified: claims.email_verified,
        },
        flow.guest,
      );
      response = NextResponse.redirect(new URL(flow.returnTo, origin()));
      response.cookies.set("tastekey_session", session, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 8 * 3600,
      });
    } catch {
      response = failed();
    }
    response.cookies.set("tastekey_oidc", "", {
      path: "/api/auth",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 0,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  return null;
}
