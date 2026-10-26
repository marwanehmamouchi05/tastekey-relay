import { test, expect } from "@playwright/test";
test.skip(
  process.env.QLOO_BROWSER_LIVE !== "1",
  "Explicit opt-in: uses the issued Qloo credential and consumes event quota.",
);
test("live Qloo Personal contexts and Studio analysis/scenario with synthetic business inputs", async ({
  page,
}) => {
  test.setTimeout(180000);
  const requests: any[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/recommend")) requests.push(r.postDataJSON());
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/personal/discover");
  await page.getByLabel("A film you love").fill("Interstellar");
  await page.getByRole("button", { name: "Find cultural reference" }).click();
  await page.getByRole("button", { name: /^Interstellar movie/ }).click();
  await page
    .getByRole("button", { name: "Emotional storytelling", exact: true })
    .click();
  await page.getByRole("button", { name: "Music", exact: true }).click();
  await page.getByLabel("An artist you love").fill("Radiohead");
  await page.getByRole("button", { name: "Find cultural reference" }).click();
  await page.getByRole("button", { name: /^Radiohead artist/ }).click();
  await page
    .getByRole("button", { name: "Luxury architecture", exact: true })
    .click();
  await page.getByRole("button", { name: "Add as my own taste" }).click();
  await page.goto("/personal/taste-dna");
  await page.getByLabel("Shopping per item (USD)").fill("60");
  await page.getByLabel("Accommodation per night (USD)").fill("60");
  await page.goto("/personal/relay");
  await page
    .getByRole("checkbox", { name: "Interstellar Film", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Emotional storytelling Film", exact: true })
    .check();
  await page.getByRole("button", { name: "Approve for 24 hours" }).click();
  await page.getByRole("button", { name: "Find live recommendations" }).click();
  await expect(page.locator(".result-card").first()).toBeVisible({
    timeout: 35000,
  });
  await page.screenshot({
    path: "docs/screenshots/personal-live-entertainment.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Shopping", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Radiohead Music", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Luxury architecture Design", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: /Apply my shopping budget locally/ })
    .check();
  await page.getByRole("button", { name: "Approve for 24 hours" }).click();
  await page.getByRole("button", { name: "Find live recommendations" }).click();
  await expect(page.locator(".result-card").first()).toBeVisible({
    timeout: 35000,
  });
  await expect(
    page.getByRole("heading", { name: "Shop by your own rules" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/personal-live-shopping.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Travel", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Interstellar Film", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: /Apply my hotel budget locally/ })
    .check();
  await page.getByRole("button", { name: "Approve for 24 hours" }).click();
  await page.getByRole("button", { name: "Find live recommendations" }).click();
  await expect(page.locator(".result-card").first()).toBeVisible({
    timeout: 35000,
  });
  await page.screenshot({
    path: "docs/screenshots/personal-live-travel.png",
    fullPage: true,
  });
  expect(requests.map((r) => r.category)).toEqual([
    "movie",
    "brand",
    "destination",
  ]);
  expect(
    requests.every(
      (r) => Object.keys(r).sort().join(",") === "category,entities",
    ),
  ).toBe(true);
  await page.goto("/studio/onboarding");
  await page
    .getByLabel("Business name")
    .fill("Live integration cinema — synthetic brief");
  await page.getByLabel("City or market").fill("Casablanca");
  await page
    .getByLabel("Products, services and catalog")
    .fill(
      "Illustrative independent-film screenings, subject to licensing. Synthetic business input for integration testing.",
    );
  await page
    .getByLabel("Primary objective")
    .fill(
      "Design a measurable screening pilot. This is an integration test, not a real business outcome.",
    );
  await page.getByLabel("Pilot budget").fill("500");
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("MAD");
  await page
    .getByLabel("Operating constraints")
    .fill(
      "Validate screening rights. One evening per week; no guaranteed attendance.",
    );
  await page
    .getByLabel("Cultural reference", { exact: true })
    .fill("Interstellar");
  await page.getByRole("button", { name: "Search Qloo", exact: true }).click();
  await page
    .locator(".search-results button")
    .filter({ hasText: "Interstellar" })
    .first()
    .click();
  await page.getByRole("button", { name: "Save business profile" }).click();
  await expect(
    page.getByText("Business saved in your private server-side workspace."),
  ).toBeVisible();
  await page.goto("/studio/analysis");
  await page
    .getByRole("button", { name: "Run Qloo analysis", exact: true })
    .click();
  await expect(
    page.getByText("Qloo response received", { exact: true }),
  ).toBeVisible({ timeout: 35000 });
  await expect(page.locator(".strategy")).toHaveCount(4);
  await page.screenshot({
    path: "docs/screenshots/studio-live-analysis.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Accept", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Create action plan" })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Plan saved in Action plans" }),
  ).toBeVisible();
  await page.goto("/studio/scenarios");
  await page.getByLabel("City / market", { exact: true }).fill("Rabat");
  await page.getByLabel("Pilot budget (MAD)", { exact: true }).fill("250");
  await page.getByRole("button", { name: "Run alternative scenario" }).click();
  await expect(
    page.getByText("Qloo response received", { exact: true }),
  ).toBeVisible({ timeout: 35000 });
  await page.screenshot({
    path: "docs/screenshots/studio-live-scenario.png",
    fullPage: true,
  });
  await page.reload();
  await page.goto("/studio/actions");
  await expect(page.getByLabel("Task").first()).toHaveValue(
    /Validate access to/,
  );
});
