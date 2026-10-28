import { test, expect } from "./fixtures";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const origin = { Origin: baseURL };
test("Personal: discovery, verification, persistence, correction, consent, deletion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/personal/discover");
  await page.getByLabel("A film you love").fill("Interstellar");
  await page.getByRole("button", { name: "Add without searching" }).click();
  await page
    .getByText("Help us understand your choice (optional)", { exact: true })
    .click();
  await expect(page.getByText("What do you like about")).toBeVisible();
  await page
    .getByRole("button", { name: "Visual world-building", exact: true })
    .click();
  await expect(
    page.getByText("You’re all set. Add another like whenever you want."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".recent-tastes").getByText("Interstellar", { exact: true }),
  ).toBeVisible();
  await page.getByText("Try an example", { exact: true }).click();
  await page
    .getByRole("button", { name: "Luxury architecture", exact: true })
    .click();
  await page.getByRole("button", { name: "Add this", exact: true }).click();
  await page.goto("/personal/taste-dna");
  await page.getByLabel("Accommodation per night (USD)").fill("60");
  await page.reload();
  await expect(page.getByLabel("Accommodation per night (USD)")).toHaveValue(
    "60",
  );
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tastekey.profile.v1")!),
  );
  expect(
    data.nodes.some((n: any) => n.label === "Luxury architecture"),
  ).toBeTruthy();
  expect(data.nodes.some((n: any) => n.label === "Interstellar")).toBeTruthy();
  await page.goto("/personal/discover");
  expect(await (await page.request.get("/api/status")).json()).toHaveProperty(
    "qloo",
  );
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "docs/screenshots"}/personal-desktop.png`,
    fullPage: true,
  });
  await page.goto("/personal/relay");
  await expect(page.getByText("Nothing is shared yet")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Interstellar Film", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Share these likes for 24 hours" })
    .click();
  await expect(page.getByText("1 like selected")).toBeVisible();
  await page.getByRole("button", { name: "Stop sharing" }).click();
  await expect(
    page.getByRole("button", { name: "Get suggestions" }),
  ).toBeDisabled();
  await page.goto("/personal/proof");
  await page.getByRole("button", { name: "Delete my local profile" }).click();
  await page.getByRole("button", { name: "Delete now", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("tastekey.profile.v1")!).nodes.length,
      ),
    )
    .toBe(0);
  const deleted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tastekey.profile.v1")!),
  );
  expect(deleted.nodes).toEqual([]);
  expect(deleted.consents).toEqual({});
});
test("Studio: save/reopen business, baseline strategy, plan, outcome, and learning", async ({
  page,
}) => {
  await page.goto("/studio/onboarding");
  await page.getByLabel("Business name").fill("Atlas Test Cinema");
  await page.getByLabel("City").fill("Casablanca");
  await page
    .getByLabel("What do you offer?")
    .fill("Weekly independent film screenings");
  await page
    .getByLabel("What is your goal?")
    .fill("Increase attendance at weekly screenings");
  await page.getByLabel("Pilot budget").fill("1000");
  await page.getByRole("button", { name: "Save business profile" }).click();
  await expect(
    page.getByText("Business saved in your private server-side workspace."),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Business name")).toHaveValue(
    "Atlas Test Cinema",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/studio/dashboard");
  expect(await (await page.request.get("/api/status")).json()).toHaveProperty(
    "qloo",
  );
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "docs/screenshots"}/studio-desktop.png`,
    fullPage: true,
  });
  await page.goto("/studio/analysis");
  await page.getByText("More options", { exact: true }).click();
  await page.getByRole("button", { name: "Make a basic plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Run a small cinema experiment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Create action plan" }).click();
  await expect(
    page.getByRole("button", { name: "Plan saved in Action plans" }),
  ).toBeVisible();
  await page.goto("/studio/actions");
  await expect(page.getByLabel("Task").first()).toHaveValue(
    /Choose one existing offering/,
  );
  await page
    .getByLabel("Measurable objective")
    .first()
    .fill("30 attendees at the pilot");
  await page.getByLabel("Status").first().selectOption("done");
  await page.getByRole("button", { name: "Save action" }).first().click();
  await expect(
    page.getByText("Saved to your business workspace"),
  ).toBeVisible();
  await page.goto("/studio/outcomes");
  await page.getByLabel("Implemented action").selectOption({ index: 1 });
  await page.getByLabel("Actual reported result").fill("12");
  await page.getByRole("button", { name: "Save reported outcome" }).click();
  await expect(page.getByText("12 actual")).toBeVisible();
  await page.reload();
  await expect(page.getByText("12 actual")).toBeVisible();
  await page.goto("/studio/analysis");
  await page.getByText("More options", { exact: true }).click();
  await page.getByRole("button", { name: "Make a basic plan" }).click();
  await expect(
    page.getByText(/Attendance: reported 12 against target 30/),
  ).toBeVisible();
});
test("API: tenant isolation, cross-origin denial, no raw Personal profile exposure", async ({
  playwright,
}) => {
  const a = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: origin,
  });
  const b = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: origin,
  });
  await a.post("/api/session");
  await b.post("/api/session");
  const created = await a.post("/api/business", {
    data: {
      input: {
        name: "Private A",
        industry: "cinema",
        city: "Rabat",
        catalog: "Films",
        audience: "Visitors",
        positioning: "",
        competitors: "",
        goal: "Test attendance",
        budget: 100,
        currency: "MAD",
        constraints: "",
        seeds: [],
      },
    },
  });
  expect(created.ok()).toBeTruthy();
  const business = await created.json();
  const denied = await b.post("/api/analysis", {
    data: { businessId: business.id, baseline: true },
  });
  expect(denied.status()).toBe(404);
  const overwrite = await b.post("/api/business", {
    data: { id: business.id, input: business },
  });
  expect(overwrite.status()).toBe(404);
  const records = await b.get("/api/workspace");
  expect((await records.json()).businesses).toEqual([]);
  const csrf = await a.post("/api/business", {
    headers: { Origin: "https://evil.example" },
    data: {},
  });
  expect(csrf.status()).toBe(403);
  const personal = await a.get("/api/personal-profile");
  expect(personal.status()).toBe(404);
  await a.dispose();
  await b.dispose();
});
test("Missing references are recorded as failure without fictional cultural results", async ({
  request,
}) => {
  await request.post("/api/session", { headers: origin });
  const create = await request.post("/api/business", {
    headers: origin,
    data: {
      input: {
        name: "No evidence",
        industry: "cinema",
        city: "Rabat",
        catalog: "Films",
        audience: "",
        positioning: "",
        competitors: "",
        goal: "Test screenings",
        budget: 0,
        currency: "MAD",
        constraints: "",
        seeds: [],
      },
    },
  });
  const b = await create.json();
  const res = await request.post("/api/analysis", {
    headers: origin,
    data: { businessId: b.id },
  });
  const a = await res.json();
  expect(a.mode).toBe("unavailable");
  expect(a.evidence).toEqual([]);
  expect(a.strategies).toEqual([]);
  expect(a.error).toContain("reviewed Qloo");
});
test("Mobile layout, keyboard focus and customer privacy limitation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/personal/discover");
  await expect(
    page.getByRole("heading", {
      name: "Find more of what you love.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Studio ↗", exact: true }).click();
  await page.goto("/studio/onboarding");
  await expect(
    page.getByRole("heading", { name: "Tell us about your business" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  );
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "docs/screenshots"}/studio-mobile.png`,
    fullPage: true,
  });
});
