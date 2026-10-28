import { test, expect } from "./fixtures";
import { resolve } from "node:path";
import { emptyProfile, addPreference } from "../../packages/taste-engine";
import { completeSignIn } from "../../apps/web/lib/identity";
import { tenantFor, put } from "../../apps/web/lib/db";
const remote = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const screenshots =
  process.env.PLAYWRIGHT_SCREENSHOTS || "test-results/integrations";

test("search filter checks visible cards locally, applies a known-currency budget and restores the page", async ({
  page,
}) => {
  await page.route("**/filter-fixture", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><main>
    <article data-tastekey-result id="sea"><a href="https://example.org/sea">Sea adventure book</a><p>$12.00</p></article>
    <article data-tastekey-result id="design"><a href="https://example.org/design">Modern architecture book</a><p>USD 18.00</p></article>
    <article data-tastekey-result id="unknown"><a href="https://example.org/unknown">Architecture stories</a><p>Ask for a price</p></article>
    </main></body></html>`,
    }),
  );
  await page.goto("/filter-fixture");
  await page.addScriptTag({
    path: resolve("apps/web/public/integration/match.js"),
  });
  await page.addScriptTag({ path: resolve("extension/filter.js") });
  const result = await page.evaluate(() =>
    (globalThis as any).TasteKeyPageFilter.apply([{ label: "architecture" }], {
      max: 20,
      currency: "USD",
    }),
  );
  expect(result).toMatchObject({ matches: 1, total: 3 });
  await expect(page.locator("#design")).toBeVisible();
  await expect(page.locator("#sea")).toBeHidden();
  await expect(page.locator("#unknown")).toBeHidden();
  await page.getByRole("button", { name: "Show all", exact: true }).click();
  await expect(page.locator("#sea")).toBeVisible();
  await expect(page.locator("#unknown")).toBeVisible();
  const none = await page.evaluate(() =>
    (globalThis as any).TasteKeyPageFilter.apply(
      [{ label: "nonmatchingword" }],
      null,
    ),
  );
  expect(none.message).toContain("All results are still visible");
  await expect(page.locator("#design")).toBeVisible();
  await page.evaluate(() => {
    const p = document.createElement("input");
    p.type = "password";
    document.body.append(p);
  });
  const blocked = await page.evaluate(() =>
    (globalThis as any).TasteKeyPageFilter.apply(
      [{ label: "architecture" }],
      null,
    ),
  );
  expect(blocked.message).toContain("sign-in or payment");
});

test("business widget publishes only chosen offers, ranks by explicit popup consent and clears likes", async ({
  page,
  context,
}) => {
  test.skip(
    remote,
    "Local account fixtures are never production authentication bypasses.",
  );
  process.env.TASTEKEY_DB_PATH = resolve("test-results/browser.db");
  const suffix = crypto.randomUUID(),
    token = completeSignIn({
      iss: "https://synthetic-widget.example",
      sub: suffix,
      email: suffix + "@example.org",
      email_verified: true,
    });
  const tenant = tenantFor(token)!,
    id = crypto.randomUUID(),
    origin = "http://localhost:3000";
  put(tenant, "business", id, {
    id,
    name: "Synthetic widget bookshop",
    industry: "bookshop",
    city: "Casablanca",
    catalog: "Sample books",
    audience: "Readers",
    positioning: "",
    competitors: "",
    goal: "Test relevant offers",
    budget: 300,
    currency: "USD",
    constraints: "Private internal fixture",
    seeds: [],
    updatedAt: new Date().toISOString(),
  } as any);
  await context.addCookies([
    {
      name: "tastekey_session",
      value: token,
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const profile = addPreference(
    emptyProfile(),
    "Modern architecture",
    "design",
  );
  await context.addInitScript(
    (p) => localStorage.setItem("tastekey.profile.v1", JSON.stringify(p)),
    profile,
  );
  await page.goto("/studio/integrations");
  await page
    .getByLabel("Your website address")
    .fill("https://shop.example.org");
  await page.getByRole("button", { name: "Save website settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Add an offer", exact: true }),
  ).toBeVisible();
  async function add(
    title: string,
    tags: string,
    path: string,
    publish: boolean,
  ) {
    if (!(await page.getByLabel("Offer name", { exact: true }).isVisible()))
      await page.getByText("Add an offer", { exact: true }).click();
    await page.getByLabel("Offer name", { exact: true }).fill(title);
    await page
      .getByLabel("Offer link on your website")
      .fill("https://shop.example.org/" + path);
    await page.getByLabel("Words that describe this offer").fill(tags);
    await page.getByLabel("Price (optional)", { exact: true }).fill("18");
    await page
      .getByRole("checkbox", {
        name: "Publish this offer when the widget is on",
      })
      .setChecked(publish);
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/integration/offer") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save offer", exact: true }).click();
    expect((await saved).ok()).toBe(true);
    await expect(page.getByLabel("Offer name", { exact: true })).toHaveValue(
      "",
    );
  }
  await add("Sea adventure (synthetic)", "sea, adventure", "sea", true);
  await add(
    "Architecture book (synthetic)",
    "architecture, design, modern",
    "design",
    true,
  );
  await add("Unpublished private draft", "private", "private", false);
  await page
    .getByRole("checkbox", { name: "Turn on the public widget" })
    .check();
  await page.getByRole("button", { name: "Save website settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Add it to your website" }),
  ).toBeVisible();
  const saved = await (
      await page.request.get("/api/integration?businessId=" + id)
    ).json(),
    site = saved.site.id;
  const published = await (
    await page.request.get("/api/widget-data/" + site)
  ).json();
  expect(published.offers).toHaveLength(2);
  expect(JSON.stringify(published)).not.toMatch(
    /Private internal|Unpublished private|workspace|email|budget/,
  );
  const html = await page.request.get("/api/widget/" + site);
  expect(html.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'self' https://shop.example.org",
  );
  expect(html.headers()["x-frame-options"]).toBe("DENY");
  await page.getByText("Preview your widget", { exact: true }).click();
  const frame = page.frameLocator('iframe[title="Your TasteKey widget"]');
  await expect(frame.locator("article").first()).toContainText("Sea adventure");
  const popupPromise = page.waitForEvent("popup");
  await frame
    .getByRole("button", { name: "Use my likes", exact: true })
    .click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("button", { name: "Use selected likes" }),
  ).toBeDisabled();
  await popup
    .getByRole("checkbox", { name: "Modern architecture", exact: true })
    .check();
  await popup
    .getByRole("checkbox", { name: /Use only these selected likes/ })
    .check();
  const sent: string[] = [];
  popup.on("request", (r) => {
    if (r.method() === "POST") sent.push(r.postData() || "");
  });
  await popup.getByRole("button", { name: "Use selected likes" }).click();
  await expect(frame.locator("article").first()).toContainText(
    "Architecture book",
  );
  expect(sent.join(" ")).not.toContain("Modern architecture");
  await frame.getByRole("button", { name: "Stop using my likes" }).click();
  await expect(frame.locator("article").first()).toContainText("Sea adventure");
  await expect(
    frame.getByText("Your likes have been cleared.", { exact: false }),
  ).toBeVisible();
  await popup.close();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: screenshots + "/business-widget.png",
    fullPage: true,
  });
  await page
    .getByRole("checkbox", { name: "Turn on the public widget" })
    .uncheck();
  await page.getByRole("button", { name: "Save website settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Add it to your website" }),
  ).toHaveCount(0);
  expect((await page.request.get("/api/widget-data/" + site)).status()).toBe(
    404,
  );
  await page.request.delete("/api/workspace", { headers: { Origin: origin } });
});

test("integration page explains installation and the sample widget is clearly labelled", async ({
  page,
}) => {
  await page.goto("/integrations");
  await expect(
    page.getByRole("heading", { name: "Use TasteKey on other websites" }),
  ).toBeVisible();
  const download = await page.request.get("/downloads/tastekey-extension.zip");
  expect(download.ok()).toBe(true);
  expect((await download.body()).subarray(0, 2).toString()).toBe("PK");
  await page.getByText("Try a sample widget", { exact: true }).click();
  const frame = page.frameLocator('iframe[title="Sample TasteKey widget"]');
  await expect(frame.getByText("Demo only:", { exact: false })).toBeVisible();
  await expect(frame.locator("article")).toHaveCount(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: screenshots + "/integration-home.png",
    fullPage: true,
  });
});
