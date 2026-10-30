import { test, expect } from "./fixtures";

// Isolated layout/accessibility smoke checks. All data and analysis responses are synthetic.
test("mobile taste graph has a keyboard-operated list and a readable locked reference", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const at = new Date().toISOString();
  await page.addInitScript(
    (p) => localStorage.setItem("tastekey.profile.v1", JSON.stringify(p)),
    {
      version: 1,
      nodes: [
        {
          id: "mobile-like",
          label: "Interstellar",
          category: "movie",
          status: "stated",
          entity: {
            id: "synthetic-film",
            name: "Interstellar",
            category: "movie",
            tags: [],
          },
          evidence: [],
          updatedAt: at,
        },
      ],
      consents: {},
      budgets: {},
      history: [],
    },
  );
  await page.goto("/personal/taste-dna");
  await page.getByText(/^See all likes/).press("Enter");
  await page.getByText(/^See all likes/).press("Tab");
  const like = page.getByRole("button", {
    name: "Interstellar stated",
    exact: true,
  });
  await expect(like).toBeFocused();
  await like.press("Enter");
  await expect(page.getByLabel("Qloo reference (locked)")).toHaveValue(
    "Interstellar",
  );
  await expect(
    page.getByRole("button", { name: "Remove this like and its guesses" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results/astra-expanded"}/mobile-reference.png`,
    fullPage: true,
  });
});

test("mobile outcomes and scenario comparisons keep directed and legacy results readable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const business = {
    id: "synthetic-business",
    name: "Synthetic mobile cinema",
    industry: "cinema",
    city: "Casablanca",
    catalog: "Illustrative screenings",
    audience: "",
    positioning: "",
    competitors: "",
    goal: "Check mobile layouts",
    budget: 500,
    currency: "MAD",
    constraints: "Synthetic layout fixture",
    seeds: [],
  };
  const strategy = {
    id: "synthetic-strategy",
    title: "Synthetic screening pilot",
    rationale: "Layout fixture only — no Qloo call or actual business result.",
    evidenceIds: [],
    cost: 100,
    effort: "Review",
    risks: "Test data",
    dependencies: "Owner review",
    nextAction: "Review",
    status: "proposed",
    alignment: 0,
    source: "baseline",
  };
  const analysis = {
    id: "original-analysis",
    businessId: business.id,
    input: business,
    createdAt: new Date().toISOString(),
    mode: "live",
    evidence: [],
    strategies: [strategy],
    trace: [],
    limitations: ["Synthetic fixture"],
    lessons: [],
    modelUsed: false,
  };
  const outcomes = [
    {
      id: "legacy",
      businessId: business.id,
      actionId: "a",
      metric: "Legacy observation",
      expected: 10,
      actual: 5,
      date: "2026-10-29",
      notes: "No direction in old saved JSON.",
    },
    {
      id: "directed",
      businessId: business.id,
      actionId: "a",
      metric: "Cost per booking",
      direction: "lower-is-better",
      expected: 10,
      actual: 5,
      date: "2026-10-29",
      notes: "Synthetic owner report.",
    },
  ];
  const workspace = {
    businesses: [business],
    analyses: [analysis],
    actions: [],
    outcomes,
    reviews: [],
  };
  await page.route("**/api/workspace", (r) => r.fulfill({ json: workspace }));
  await page.route("**/api/analysis", async (r) => {
    const input = r.request().postDataJSON().scenario;
    const result = {
      ...analysis,
      id: "alternative-analysis",
      input,
      strategies: [{ ...strategy, cost: 50 }],
    };
    workspace.analyses.unshift(result);
    await r.fulfill({ json: result });
  });
  await page.goto("/studio/outcomes");
  await expect(
    page.locator(".outcome-record").filter({ hasText: "Legacy observation" }),
  ).toContainText("Recorded only");
  await expect(
    page.locator(".outcome-record").filter({ hasText: "Cost per booking" }),
  ).toContainText("Target met");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results/astra-expanded"}/mobile-outcomes.png`,
    fullPage: true,
  });
  await page.goto("/studio/scenarios");
  await page.getByLabel("City / market").fill("Rabat");
  await page.getByLabel("Pilot budget (MAD)").fill("250");
  await page.getByRole("button", { name: "Run alternative scenario" }).click();
  await expect(
    page.getByRole("heading", { name: "Alternative", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".comparison-columns")
      .getByText("Rabat · 250 MAD", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results/astra-expanded"}/mobile-scenario.png`,
    fullPage: true,
  });
});
