import { test, expect } from "./fixtures";

async function correctionPage(
  page: import("@playwright/test").Page,
  proposal: object,
) {
  await page.route("**/api/status", (r) =>
    r.fulfill({ json: { qloo: false, model: true, signIn: false } }),
  );
  await page.route("**/api/correction", (r) => r.fulfill({ json: proposal }));
  await page.goto("/personal/discover");
  await page.getByLabel("A film you love").fill("Synthetic original film");
  await page
    .getByRole("button", { name: "Add without searching", exact: true })
    .click();
  await page.goto("/personal/taste-dna");
}
const correctionText =
  "I love luxury architecture, but choose affordable hotels. My hotel limit is $60 a night.";

test("reviewing an AI budget does not silently add a new taste", async ({
  page,
}) => {
  // Deliberately bypass server filtering with an untrusted synthetic transport.
  await correctionPage(page, {
    label: "destination",
    category: "design",
    budget: 60,
    budgetContext: "travel",
    explanation: "Synthetic response, not a real provider result.",
  });
  const labels = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tastekey.profile.v1")!).nodes.map(
      (n: any) => n.label,
    ),
  );
  await page
    .getByPlaceholder(correctionText)
    .fill("My hotel budget is $60 a night. Keep my film tastes.");
  await page
    .getByRole("button", { name: "Interpret with language model", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Add this taste: destination",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "Use this budget: 60 USD (travel)",
      exact: true,
    }),
  ).toBeChecked();
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results"}/correction-review-synthetic.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Apply reviewed changes", exact: true })
    .click();
  await expect(page.getByLabel("Accommodation per night (USD)")).toHaveValue(
    "60",
  );
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tastekey.profile.v1")!).nodes.map(
        (n: any) => n.label,
      ),
    ),
  ).toEqual(labels);
});

test("a new taste needs an explicit check and editing text invalidates the old proposal", async ({
  page,
}) => {
  await correctionPage(page, {
    label: "Brutalist architecture",
    category: "design",
    explanation: "Synthetic explicit preference.",
  });
  const field = page.getByPlaceholder(correctionText);
  await field.fill("I love Brutalist architecture.");
  await page
    .getByRole("button", { name: "Interpret with language model", exact: true })
    .click();
  const apply = page.getByRole("button", {
    name: "Apply reviewed changes",
    exact: true,
  });
  await expect(apply).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "Add this taste: Brutalist architecture",
      exact: true,
    })
    .check();
  await expect(apply).toBeEnabled();
  await field.fill("A different correction.");
  await expect(apply).toHaveCount(0);
  await field.fill("I love Brutalist architecture.");
  await page
    .getByRole("button", { name: "Interpret with language model", exact: true })
    .click();
  await expect(apply).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "Add this taste: Brutalist architecture",
      exact: true,
    })
    .check();
  await apply.click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tastekey.profile.v1")!).nodes.some(
        (n: any) => n.label === "Brutalist architecture",
      ),
    ),
  ).toBe(true);
});
