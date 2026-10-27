import { test, expect } from "@playwright/test";
test.skip(
  process.env.MODEL_BROWSER_LIVE !== "1",
  "Explicit opt-in: calls configured model and real Qloo; consumes credits/quota.",
);
test("live model correction and evidence-grounded Studio advisor preserve protected fields", async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.goto("/personal/discover");
  await page.getByLabel("A film you love").fill("Interstellar");
  await page.getByRole("button", { name: "Add as my own taste" }).click();
  await page
    .getByRole("button", { name: "Luxury architecture", exact: true })
    .click();
  await page.getByRole("button", { name: "Add as my own taste" }).click();
  await page.goto("/personal/taste-dna");
  await page
    .getByPlaceholder(
      "I love luxury architecture, but choose affordable hotels. My hotel limit is $60 a night.",
    )
    .fill(
      "I love luxury architecture. My hotel budget is $60 a night. Keep my movie tastes.",
    );
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/api/correction"),
  );
  await page
    .getByRole("button", { name: "Interpret with language model" })
    .click();
  expect(Object.keys((await request).postDataJSON()).sort()).toEqual([
    "modelConsent",
    "text",
  ]);
  await expect(
    page.getByRole("button", { name: "Apply reviewed changes" }),
  ).toBeVisible({ timeout: 35000 });
  await page.getByRole("button", { name: "Apply reviewed changes" }).click();
  await expect(page.getByLabel("Accommodation per night (USD)")).toHaveValue(
    "60",
  );
  const profile = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tastekey.profile.v1")!),
  );
  expect(profile.nodes.some((n: any) => n.label === "Interstellar")).toBe(true);
  expect(
    profile.nodes.some((n: any) => /luxury.*architecture/i.test(n.label)),
  ).toBe(true);
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results"}/live-model-correction.png`,
    fullPage: true,
  });
  await page.goto("/studio/onboarding");
  await expect(page.getByLabel("Business name")).toBeVisible();
  const origin = new URL(page.url()).origin;
  const input = {
    name: "Synthetic AI browser verification",
    industry: "cinema",
    city: "Casablanca",
    catalog: "Independent film screenings with rights verification",
    audience: "Owner-stated film enthusiasts",
    positioning: "Small thoughtful events",
    competitors: "",
    goal: "Plan a measurable weekly pilot",
    budget: 500,
    currency: "MAD",
    constraints: "Verify rights; one evening weekly; no promised attendance",
    seeds: [
      {
        id: "057DA9D9-399B-437E-8BCA-A80E499125EF",
        name: "Interstellar",
        category: "movie",
        tags: [],
      },
    ],
  };
  expect(
    (
      await page.request.post("/api/business", {
        headers: { Origin: origin },
        data: { input },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/studio/analysis");
  await page
    .getByRole("checkbox", { name: /Use configured AI advisor/ })
    .check();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/analysis") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Run Qloo analysis", exact: true })
    .click();
  const analysis = await (await response).json();
  expect(analysis.mode).toBe("live");
  expect(analysis.modelUsed).toBe(true);
  expect(analysis.strategies).toHaveLength(4);
  for (const s of analysis.strategies) {
    expect(s.cost).toBeLessThanOrEqual(100);
    expect(
      s.evidenceIds.every((id: string) =>
        analysis.evidence.some((e: any) => e.id === id),
      ),
    ).toBe(true);
  }
  await expect(
    page.getByText("Qloo response received", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results"}/live-model-advisor.png`,
    fullPage: true,
  });
  await page.request.delete("/api/workspace", { headers: { Origin: origin } });
});
