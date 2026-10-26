import { test, expect } from "@playwright/test";
test("a revoked grant discards a pending recommendation response", async ({
  page,
}) => {
  const entity = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Interstellar",
    category: "movie",
    tags: [],
  };
  await page.route("**/api/search", (r) =>
    r.fulfill({
      json: {
        id: "synthetic-search",
        source: "qloo",
        tool: "synthetic test transport",
        inputs: {},
        at: new Date().toISOString(),
        cached: false,
        entities: [entity],
      },
    }),
  );
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/recommend", async (r) => {
    await pending;
    await r.fulfill({
      json: {
        id: "synthetic-recommend",
        source: "qloo",
        tool: "synthetic test transport",
        inputs: {},
        at: new Date().toISOString(),
        cached: false,
        entities: [{ ...entity, name: "Late synthetic result" }],
      },
    });
  });
  await page.goto("/personal/discover");
  await page.getByLabel("A film you love").fill("Interstellar");
  await page.getByRole("button", { name: "Find cultural reference" }).click();
  await page.getByRole("button", { name: "Interstellar movie" }).click();
  await page.goto("/personal/relay");
  await page
    .getByRole("checkbox", { name: "Interstellar Film", exact: true })
    .check();
  await page.getByRole("button", { name: "Approve for 24 hours" }).click();
  await page.getByRole("button", { name: "Find live recommendations" }).click();
  await page.getByRole("button", { name: "Revoke permission" }).click();
  release();
  await expect(
    page.getByRole("button", { name: "Find live recommendations" }),
  ).toBeDisabled();
  await expect(page.getByText("Late synthetic result")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("tastekey.proof.pool")),
  ).toBeNull();
});
