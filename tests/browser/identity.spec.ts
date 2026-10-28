import { test, expect } from "./fixtures";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { newSession, tenantFor, put } from "../../apps/web/lib/db";
import { completeSignIn, identity } from "../../apps/web/lib/identity";
const remote = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const screenshot =
  process.env.PLAYWRIGHT_SCREENSHOTS || "test-results/redesign";
test("taste atlas has usable discovery tiles, keyboard search entry, account and responsive navigation", async ({
  page,
}) => {
  await page.goto("/personal/discover");
  await expect(
    page.getByRole("heading", {
      name: "The things you love lead somewhere new.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start with music" }).click();
  await expect(page.getByLabel("An artist you love")).toBeFocused();
  await page.getByRole("button", { name: "Start with design" }).click();
  await page
    .getByLabel("A design you love")
    .fill("Synthetic sculptural architecture");
  await page.getByLabel("A design you love").press("Enter");
  await expect(
    page.getByRole("progressbar", { name: "Starting tastes" }),
  ).toHaveAttribute("aria-valuenow", "1");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: screenshot + "/personal-atlas-desktop.png",
    fullPage: true,
  });
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Make it yours" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore without an account" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: screenshot + "/account-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/personal/discover");
  await expect(
    page.getByRole("button", { name: "Start with places" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Taste DNA" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: screenshot + "/personal-atlas-mobile.png",
    fullPage: true,
  });
});
test("team UI and real server authorization enforce invitations, viewer writes and immediate revocation", async ({
  page,
  browser,
}) => {
  test.skip(
    remote,
    "Local database seeds are explicit fixtures, never production authentication bypasses.",
  );
  process.env.TASTEKEY_DB_PATH = resolve("test-results/browser.db");
  mkdirSync(resolve("test-results"), { recursive: true });
  const suffix = crypto.randomUUID(),
    issuer = "https://synthetic-fixture.example";
  const login = (sub: string, email: string) =>
    completeSignIn({
      iss: issuer,
      sub: sub + suffix,
      email,
      email_verified: true,
    });
  const owner = login("owner", "owner-" + suffix + "@example.org"),
    viewer = login("viewer", "viewer-" + suffix + "@example.org"),
    other = login("other", "other-" + suffix + "@example.org");
  const tenant = tenantFor(owner)!,
    businessId = crypto.randomUUID();
  put(tenant, "business", businessId, {
    id: businessId,
    name: "Synthetic shared cinema",
    industry: "cinema",
    city: "Casablanca",
    catalog: "Discussions",
    audience: "Film enthusiasts",
    positioning: "Small pilots",
    competitors: "",
    goal: "Measure interest",
    budget: 500,
    currency: "MAD",
    constraints: "Verify rights",
    seeds: [],
    updatedAt: new Date().toISOString(),
  } as any);
  const origin = "http://localhost:3000",
    headers = { Origin: origin };
  await page.context().addCookies([
    {
      name: "tastekey_session",
      value: owner,
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/studio/team");
  await expect(
    page.getByRole("heading", { name: "People in this workspace" }),
  ).toBeVisible();
  await page
    .getByLabel("Teammate email")
    .fill("viewer-" + suffix + "@example.org");
  await page.getByLabel("Invitation role").selectOption("viewer");
  const created = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/team/invite") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create team invitation" }).click();
  const code = (await (await created).json()).invitation;
  const viewerContext = await browser.newContext({ baseURL: origin });
  await viewerContext.addCookies([
    {
      name: "tastekey_session",
      value: viewer,
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const reader = await viewerContext.newPage();
  const wrongContext = await browser.newContext({ baseURL: origin });
  await wrongContext.addCookies([
    {
      name: "tastekey_session",
      value: other,
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  expect(
    (
      await wrongContext.request.post("/api/team/accept", {
        headers,
        data: { invitation: code },
      })
    ).status(),
  ).toBe(403);
  await wrongContext.close();
  await reader.goto("/studio/team#invite=" + code);
  await reader.getByRole("button", { name: "Join invited workspace" }).click();
  await reader.waitForURL("**/studio/dashboard");
  await expect(reader.getByText(/You have viewer access/)).toBeVisible();
  const saved = await reader.request.get("/api/workspace");
  expect((await saved.json()).businesses[0].id).toBe(businessId);
  expect(
    (
      await reader.request.post("/api/business", {
        headers,
        data: { input: {} },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await reader.request.post("/api/team/invite", {
        headers,
        data: { email: "no@example.org", role: "admin" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await reader.request.delete("/api/workspace", { headers })).status(),
  ).toBe(403);
  expect(
    (
      await reader.request.post("/api/recovery/create", { headers, data: {} })
    ).status(),
  ).toBe(403);
  await page.reload();
  await expect(
    page.getByText("viewer-" + suffix + "@example.org", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: screenshot + "/studio-team-desktop.png",
    fullPage: true,
  });
  const viewerId = identity(viewer)!.id;
  const revoked = await page.request.post("/api/team/member", {
    headers,
    data: { userId: viewerId, role: "remove" },
  });
  expect(revoked.ok()).toBe(true);
  expect((await reader.request.get("/api/workspace")).status()).toBe(401);
  await page.request.delete("/api/workspace", { headers });
  await viewerContext.close();
});
