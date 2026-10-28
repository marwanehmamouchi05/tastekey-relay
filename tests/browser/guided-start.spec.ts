import { test, expect } from "./fixtures";

test("Guided Start: choices need confirmation, failures save nothing, and likes persist", async ({
  page,
}) => {
  const searches: unknown[] = [];
  await page.route("**/api/search", async (route) => {
    searches.push(route.request().postDataJSON());
    const query = route.request().postDataJSON().query;
    if (query === "Jurassic Park") {
      await route.fulfill({
        status: 503,
        json: { error: "Search is unavailable. Try again later." },
      });
      return;
    }
    await route.fulfill({
      json: {
        entities:
          query === "Finding Nemo"
            ? []
            : [
                {
                  id: "guided-film-fixture",
                  name: "Interstellar",
                  category: "movie",
                  description: "Synthetic search response for this UI test.",
                },
              ],
      },
    });
  });
  await page.goto("/personal/discover");
  await page.getByRole("button", { name: "Not sure? Help me choose" }).click();
  await expect(page.getByLabel("A film you love")).toHaveCount(0);
  await page
    .getByRole("group", { name: "Choose a topic" })
    .getByRole("button", { name: "Film", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Jurassic Park", exact: true })
    .click();
  await expect(page.locator(".notice.error")).toContainText(
    "Search is unavailable",
  );
  await page.getByRole("button", { name: "Finding Nemo", exact: true }).click();
  await expect(
    page.getByText(
      "No matches. Choose another option, or switch to typing a name.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Interstellar", exact: true }).click();
  await expect(page.locator(".search-results")).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tastekey.profile.v1")!).nodes,
    ),
  ).toEqual([]);
  expect(searches.at(-1)).toEqual({ query: "Interstellar", category: "movie" });
  await page.getByRole("button", { name: /^Interstellar movie/ }).click();
  await expect(page.locator(".recent-tastes")).toContainText("Interstellar");
  await page
    .getByRole("button", { name: "None of these? Try another topic" })
    .click();
  await page
    .getByRole("group", { name: "Choose a topic" })
    .getByRole("button", { name: "Design", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Natural materials", exact: true })
    .click();
  await expect(page.locator(".recent-tastes")).not.toContainText(
    "Natural materials",
  );
  await page.getByRole("button", { name: "Add this style" }).click();
  await expect(page.locator(".recent-tastes")).toContainText(
    "Natural materials",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Which of these do you like?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/guided-start-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".recent-tastes")).toContainText(
    "Natural materials",
  );
  await expect(page.getByLabel("A film you love")).toBeVisible();
});
