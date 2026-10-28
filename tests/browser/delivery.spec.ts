import { test, expect } from "./fixtures";
const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const headers = { Origin: base };
const business = {
  name: "Synthetic delivery verification",
  industry: "cinema",
  city: "Rabat",
  catalog: "Synthetic film pilot",
  audience: "",
  positioning: "",
  competitors: "",
  goal: "Verify saved human reviews",
  budget: 100,
  currency: "MAD",
  constraints: "Synthetic test, no actual customer outcomes",
  seeds: [],
};
test("human rubric persists and a one-use recovery code reopens only its workspace", async ({
  page,
  browser,
}) => {
  await page.goto("/studio/onboarding");
  await expect(page.getByLabel("Business name")).toBeVisible();
  const created = await page.request.post("/api/business", {
    headers,
    data: { input: business },
  });
  expect(created.ok()).toBeTruthy();
  const b = await created.json();
  const run = await page.request.post("/api/analysis", {
    headers,
    data: { businessId: b.id, baseline: true },
  });
  const a = await run.json();
  await page.goto("/studio/reviews");
  await page.getByLabel("Analysis to review").selectOption(a.id);
  await page.getByLabel("Reviewer alias").fill("Synthetic test reviewer");
  for (const label of [
    "Relevance",
    "Feasibility",
    "Specificity",
    "Cultural grounding",
    "Traceability",
  ])
    await page
      .getByRole("combobox", { name: label, exact: true })
      .selectOption("3");
  await page
    .getByLabel("Review rationale")
    .fill(
      "Synthetic browser check of storage; this is not a real human evaluation.",
    );
  await page.getByRole("button", { name: "Save human review" }).click();
  await expect(
    page.getByText("Review saved with its exact analysis and timestamp."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Saved reviews (1)" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results"}/human-review.png`,
    fullPage: true,
  });
  await page.goto("/studio/dashboard");
  await page
    .getByRole("button", { name: "Create recovery code", exact: true })
    .click();
  const code = await page.getByTestId("recovery-code").innerText();
  expect(code).toMatch(/^[a-f0-9]{64}$/);
  const context = await browser.newContext({ baseURL: base });
  const other = await context.newPage();
  await other.goto("/studio/onboarding");
  await other.getByLabel("Recovery code", { exact: true }).fill(code);
  await other
    .getByRole("button", { name: "Restore workspace", exact: true })
    .click();
  await expect(
    other.getByRole("heading", {
      name: "Your next move, Synthetic delivery verification.",
    }),
  ).toBeVisible();
  const workspace = await other.request.get("/api/workspace");
  expect((await workspace.json()).reviews).toHaveLength(1);
  expect((await page.request.get("/api/workspace")).status()).toBe(401);
  expect(
    (
      await other.request.post("/api/recovery/restore", {
        headers,
        data: { code },
      })
    ).status(),
  ).toBe(403);
  await other.request.delete("/api/workspace", { headers });
  await context.close();
});
test("anonymous audience preview requires verified sign-in before contribution", async ({
  page,
  browser,
}) => {
  await page.goto("/studio/onboarding");
  await expect(page.getByLabel("Business name")).toBeVisible();
  const created = await page.request.post("/api/business", {
    headers,
    data: { input: { ...business, name: "Synthetic consent verification" } },
  });
  const b = await created.json();
  const invited = await page.request.post("/api/audience/invite", {
    headers,
    data: { businessId: b.id },
  });
  const { invitation } = await invited.json();
  const context = await browser.newContext({ baseURL: base });
  const person = await context.newPage();
  await person.goto("/personal/discover");
  await person.getByLabel("A film you love").fill("Synthetic taste");
  await person.getByRole("button", { name: "Add without searching" }).click();
  await person.goto("/personal/proof#audience=" + invitation);
  await person
    .getByRole("button", { name: "Review audience invitation" })
    .click();
  await expect(
    person.getByText("Recipient: Synthetic consent verification"),
  ).toBeVisible();
  const share = person.getByRole("button", {
    name: "Share selected category summary",
  });
  await expect(share).toBeDisabled();
  await person.getByRole("checkbox", { name: "movie", exact: true }).check();
  await expect(share).toBeDisabled();
  await person
    .getByRole("checkbox", {
      name: "I consent to this category summary being stored for this business for 30 days.",
    })
    .check();
  await expect(share).toBeDisabled();
  const denied = await person.request.post("/api/audience/contribute", {
    headers,
    data: { invitation, categories: ["movie"], consent: true },
  });
  expect(denied.status()).toBe(401);
  const unauthorized = await person.request.get(
    "/api/audience/report?businessId=" + b.id,
  );
  expect(unauthorized.status()).toBe(404);
  const report = await page.request.get(
    "/api/audience/report?businessId=" + b.id,
  );
  expect(await report.json()).toMatchObject({ suppressed: true, groups: [] });
  await expect(
    person.getByText("No active category contributions."),
  ).toBeVisible();
  await page.goto("/studio/audience");
  await expect(page.getByText(/Insufficient consented data/)).toBeVisible();
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results"}/audience-safeguards.png`,
    fullPage: true,
  });
  await page.request.delete("/api/workspace", { headers });
  await context.close();
});
test("scripts require a changing nonce while the interactive graph and quote budget filter work", async ({
  page,
}) => {
  const first = await page.goto("/personal/discover");
  const csp = first!.headers()["content-security-policy"];
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).not.toContain("script-src 'unsafe-inline'");
  const nonce = csp.match(/'nonce-([^']+)'/)![1];
  expect(
    await page
      .locator("script[nonce]")
      .first()
      .evaluate((el) => (el as HTMLScriptElement).nonce),
  ).toBe(nonce);
  const second = await page.reload();
  expect(second!.headers()["content-security-policy"]).not.toContain(
    `'nonce-${nonce}'`,
  );
  const entity = {
    id: "synthetic-destination",
    name: "Synthetic destination",
    category: "destination",
    tags: [],
  };
  await page.route("**/api/search", (r) =>
    r.fulfill({ json: { id: "synthetic-search", entities: [entity] } }),
  );
  await page.route("**/api/recommend", (r) =>
    r.fulfill({ json: { id: "synthetic-response", entities: [entity] } }),
  );
  await page.getByRole("button", { name: "Places", exact: true }).click();
  await page.getByLabel("A place you love").fill("Synthetic destination");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator(".search-results button").first().click();
  await page.goto("/personal/taste-dna");
  await page.getByLabel("Accommodation per night (USD)").fill("60");
  await page.goto("/personal/relay");
  await page.getByRole("button", { name: "Travel", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Synthetic destination Destinations",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", { name: /Apply my hotel budget locally/ })
    .check();
  await page
    .getByRole("button", { name: "Share these likes for 24 hours" })
    .click();
  await page.getByRole("button", { name: "Get suggestions" }).click();
  await expect(page.locator(".result-card").first()).toBeVisible();
  const save = async (name: string, price: string) => {
    await page.getByLabel("Quoted destination").selectOption(entity.id);
    await page.getByLabel("Accommodation name").fill(name);
    await page.getByLabel("Quoted nightly price (USD)").fill(price);
    await page
      .getByLabel("Stay date")
      .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await page
      .getByLabel("Public quote source (HTTPS)")
      .fill("https://example.org/synthetic-fixture");
    await page
      .getByRole("button", { name: "Save checked travel quote" })
      .click();
  };
  await save("Synthetic budget quote", "55");
  await save("Synthetic over-budget quote", "90");
  await expect(
    page.getByRole("heading", {
      name: "Synthetic budget quote · Synthetic destination",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic over-budget quote · Synthetic destination",
    }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results"}/travel-quote-fixture.png`,
    fullPage: true,
  });
});
