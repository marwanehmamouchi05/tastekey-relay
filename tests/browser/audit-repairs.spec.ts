import { test, expect } from "./fixtures";
const origin = {
  Origin: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
};
const film = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Interstellar",
  category: "movie" as const,
  tags: [],
};
function savedReference() {
  const at = new Date().toISOString();
  return {
    version: 1,
    nodes: [
      {
        id: "reviewed",
        label: film.name,
        category: "movie",
        status: "stated",
        entity: film,
        evidence: [],
        updatedAt: at,
      },
      {
        id: "reason",
        parentId: "reviewed",
        label: "Visual world-building",
        category: "movie",
        status: "inferred",
        evidence: [],
        updatedAt: at,
      },
    ],
    consents: {
      entertainment: {
        context: "entertainment",
        nodeIds: ["reviewed", "reason"],
        budget: false,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    },
    budgets: {},
    history: [],
  };
}
test("reviewed identity stays locked; removing and re-adding requires fresh consent", async ({
  page,
}) => {
  await page.goto("/personal/taste-dna");
  await page.evaluate(
    (p) => localStorage.setItem("tastekey.profile.v1", JSON.stringify(p)),
    savedReference(),
  );
  await page.reload();
  await page.getByText(/^See all likes/).click();
  await page
    .getByRole("button", { name: "Interstellar stated", exact: true })
    .click();
  await expect(page.getByLabel("Qloo reference (locked)")).toHaveValue(
    "Interstellar",
  );
  await expect(page.getByLabel("Qloo reference (locked)")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByLabel("Status").selectOption("confirmed");
  await page.reload();
  const requested: string[][] = [];
  await page.route("**/api/recommend", async (r) => {
    requested.push(r.request().postDataJSON().entities);
    await r.fulfill({
      json: {
        id: "synthetic",
        source: "qloo",
        tool: "synthetic test transport",
        inputs: {},
        at: new Date().toISOString(),
        cached: false,
        entities: [
          { ...film, id: "different-result", name: "Synthetic result" },
        ],
      },
    });
  });
  await page.goto("/personal/relay");
  await page.getByRole("button", { name: "Get suggestions" }).click();
  await expect(
    page.getByText("Synthetic result", { exact: true }),
  ).toBeVisible();
  expect(requested).toEqual([[film.id]]);
  await page.goto("/personal/taste-dna");
  await page.getByText(/^See all likes/).click();
  await page
    .getByRole("button", { name: "Interstellar confirmed", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove this like and its guesses" })
    .click();
  await page.route("**/api/search", (r) =>
    r.fulfill({
      json: {
        entities: [
          {
            ...film,
            id: "22222222-2222-4222-8222-222222222222",
            name: "Spirited Away",
          },
        ],
      },
    }),
  );
  await page.goto("/personal/discover");
  await page.getByLabel("A film you love").fill("Spirited Away");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: /^Spirited Away movie/ }).click();
  await page.goto("/personal/relay");
  await expect(
    page.getByRole("button", { name: "Get suggestions" }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Spirited Away Film", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Update permission", exact: true })
    .click();
  await page.getByRole("button", { name: "Get suggestions" }).click();
  await expect.poll(() => requested.length).toBe(2);
  expect(requested[1]).toEqual(["22222222-2222-4222-8222-222222222222"]);
});
test("legacy mismatched identity and its reasons cannot be shared after reload", async ({
  page,
}) => {
  let p = savedReference();
  p.nodes[1].status = "confirmed";
  p.nodes[0].label = "Spirited Away";
  await page.goto("/personal/relay");
  await page.evaluate(
    (p) => localStorage.setItem("tastekey.profile.v1", JSON.stringify(p)),
    p,
  );
  await page.reload();
  await expect(
    page.getByText(/A saved name does not match its Qloo reference/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get suggestions" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: /Spirited Away|Visual world/ }),
  ).toHaveCount(0);
  await page.goto("/personal/taste-dna");
  await page.getByText(/^See all likes/).click();
  await page
    .getByRole("button", { name: "Spirited Away stated", exact: true })
    .click();
  await expect(page.getByLabel("Qloo reference (locked)")).toHaveValue(
    "Interstellar",
  );
  await expect(page.getByText(/The saved name differs/)).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("tastekey.profile.v1")!).nodes[0].label,
    ),
  ).toBe("Spirited Away");
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results/astra-repairs"}/legacy-reference-review.png`,
    fullPage: true,
  });
});
test("outcome direction validates, persists and drives the displayed assessment", async ({
  page,
}) => {
  await page.request.post("/api/session", { headers: origin });
  const b = await (
    await page.request.post("/api/business", {
      headers: origin,
      data: {
        input: {
          name: "Synthetic outcome check",
          industry: "cinema",
          city: "Rabat",
          catalog: "Films",
          audience: "",
          positioning: "",
          competitors: "",
          goal: "Check cost per booking",
          budget: 1000,
          currency: "MAD",
          constraints: "Synthetic test only",
          seeds: [],
        },
      },
    })
  ).json();
  const action = await (
    await page.request.post("/api/action", {
      headers: origin,
      data: {
        businessId: b.id,
        input: {
          title: "Synthetic action",
          owner: "Test",
          cost: 100,
          due: "2026-10-29",
          status: "done",
          priority: "medium",
          dependencies: "",
          objective: "Test",
        },
      },
    })
  ).json();
  const invalid = await page.request.post("/api/outcome", {
    headers: origin,
    data: {
      input: {
        actionId: action.id,
        metric: "Cost",
        direction: "guess",
        expected: 10,
        actual: 5,
        date: "2026-10-29",
        notes: "",
      },
    },
  });
  expect(invalid.status()).toBe(400);
  await page.goto("/studio/outcomes");
  await page.getByLabel("Implemented action").selectOption(action.id);
  await expect(page.getByLabel("What counts as a good result?")).toHaveValue(
    "observe-only",
  );
  await page.getByLabel("Metric", { exact: true }).fill("Cost per booking");
  await page
    .getByLabel("What counts as a good result?")
    .selectOption("lower-is-better");
  await page.getByLabel("Original target").fill("10");
  await page.getByLabel("Actual reported result").fill("5");
  await page.getByRole("button", { name: "Save reported outcome" }).click();
  await expect(
    page.locator(".outcome-record").filter({ hasText: "Cost per booking" }),
  ).toContainText("Target met");
  await page.reload();
  await expect(
    page.locator(".outcome-record").filter({ hasText: "Cost per booking" }),
  ).toContainText("Lower is better");
  const records = await (await page.request.get("/api/workspace")).json();
  expect(records.outcomes[0].direction).toBe("lower-is-better");
  await page.request.post("/api/outcome", {
    headers: origin,
    data: {
      input: {
        actionId: action.id,
        metric: "Worse booking cost",
        direction: "lower-is-better",
        expected: 10,
        actual: 20,
        date: "2026-10-29",
        notes: "",
      },
    },
  });
  await page.request.post("/api/outcome", {
    headers: origin,
    data: {
      input: {
        actionId: action.id,
        metric: "Unjudged legacy input",
        expected: 10,
        actual: 5,
        date: "2026-10-29",
        notes: "",
      },
    },
  });
  await page.reload();
  await expect(
    page.locator(".outcome-record").filter({ hasText: "Worse booking cost" }),
  ).toContainText("Target missed");
  await expect(
    page
      .locator(".outcome-record")
      .filter({ hasText: "Unjudged legacy input" }),
  ).toContainText("Recorded only");
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results/astra-repairs"}/outcome-direction.png`,
    fullPage: true,
  });
  expect(
    (await page.request.delete("/api/workspace", { headers: origin })).ok(),
  ).toBe(true);
});
