import { test, expect } from "./fixtures";
import {
  addPreference,
  emptyProfile,
  verify,
} from "../../packages/taste-engine";

test("comparison uses only currently authorized confirmed likes and the production reranker", async ({
  page,
  context,
}) => {
  let profile = addPreference(
    emptyProfile(),
    "Synthetic film reference",
    "movie",
  );
  const parent = profile.nodes[0];
  const emotional = profile.nodes.find(
    (n) => n.label === "Emotional storytelling",
  )!;
  profile = verify(profile, parent.id, emotional.id);
  profile = addPreference(profile, "Architecture", "design");
  profile.nodes.at(-1)!.label = "Architecture";
  profile.nodes.at(-1)!.status = "confirmed";
  profile.consents.entertainment = {
    context: "entertainment",
    nodeIds: [emotional.id],
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    budget: false,
  };
  const pool = {
    id: "synthetic-proof-pool",
    context: "entertainment",
    source: "qloo",
    entities: [
      {
        id: "architecture",
        name: "Architecture film",
        category: "movie",
        tags: [],
      },
      {
        id: "emotional",
        name: "Emotional storytelling film",
        category: "movie",
        tags: [],
      },
    ],
  };
  await context.addInitScript(
    ({ profile, pool }) => {
      if (sessionStorage.getItem("proof-fixture")) return;
      localStorage.setItem("tastekey.profile.v1", JSON.stringify(profile));
      localStorage.setItem("tastekey.proof.pool", JSON.stringify(pool));
      sessionStorage.setItem("proof-fixture", "ready");
    },
    { profile, pool },
  );
  await page.goto("/personal/proof");
  await page
    .getByLabel("Which result would you choose?")
    .selectOption("emotional");
  await page.getByRole("button", { name: "Record comparison" }).click();
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tastekey.proof.records")!),
  );
  expect(records[0].rankings.adaptive).toEqual(["emotional", "architecture"]);
  expect(records[0].authorizedPreferenceIds).toEqual([emotional.id]);
  expect(records[0].questionCount).toBe(1);
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("tastekey.profile.v1")!);
    p.consents = {};
    localStorage.setItem("tastekey.profile.v1", JSON.stringify(p));
  });
  // Navigation rather than reload avoids the init fixture resetting the withdrawn grant.
  await page.goto("/personal/discover");
  await page.goto("/personal/proof");
  await page
    .getByLabel("Which result would you choose?")
    .selectOption("emotional");
  await page.getByRole("button", { name: "Record comparison" }).click();
  await expect(page.locator(".notice.error")).toContainText(
    "Sharing for this comparison has ended",
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tastekey.proof.records")!).length,
    ),
  ).toBe(1);
});

test("judge tour gives separate working entry links without requiring an account", async ({
  page,
}) => {
  await page.goto("/tour");
  await expect(
    page.getByRole("heading", { name: "Try TasteKey in a few minutes." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Try Personal", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Not sure? Help me choose" }),
  ).toBeVisible();
  await page.goto("/tour");
  await page.getByRole("link", { name: "Try Studio", exact: true }).click();
  await expect(page.getByLabel("Business name")).toBeVisible();
});
