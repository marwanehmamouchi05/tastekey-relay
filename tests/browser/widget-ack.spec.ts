import { test, expect } from "./fixtures";
import { emptyProfile, addPreference } from "../../packages/taste-engine";

test("widget confirms consent only after acknowledgement and rejects expired connections honestly", async ({
  page,
  context,
}) => {
  const profile = addPreference(
    emptyProfile(),
    "Modern architecture",
    "design",
  );
  await context.addInitScript(
    (p) => localStorage.setItem("tastekey.profile.v1", JSON.stringify(p)),
    profile,
  );
  await page.clock.install();
  await page.goto("/integrations");
  await page.getByText("Try a sample widget", { exact: true }).click();
  const frame = page.frameLocator('iframe[title="Sample TasteKey widget"]');
  const opened = page.waitForEvent("popup");
  await frame
    .getByRole("button", { name: "Use my likes", exact: true })
    .click();
  const popup = await opened;
  await popup
    .getByRole("checkbox", { name: "Modern architecture", exact: true })
    .check();
  await popup
    .getByRole("checkbox", { name: /Use only these selected likes/ })
    .check();
  await page.clock.fastForward(11 * 60000);
  await popup.getByRole("button", { name: "Use selected likes" }).click();
  await expect(popup.locator(".notice.error")).toContainText(
    "This connection expired",
  );
  await expect(
    popup.getByText("Your chosen likes are ready.", { exact: false }),
  ).toHaveCount(0);
  await expect(frame.locator("article").first()).toContainText(
    "Stories from the sea",
  );
  await popup.close();

  const reopened = page.waitForEvent("popup");
  await frame
    .getByRole("button", { name: "Use my likes", exact: true })
    .click();
  const fresh = await reopened;
  await fresh
    .getByRole("checkbox", { name: "Modern architecture", exact: true })
    .check();
  await fresh
    .getByRole("checkbox", { name: /Use only these selected likes/ })
    .check();
  await fresh.getByRole("button", { name: "Use selected likes" }).click();
  await expect(
    fresh.getByText("Your chosen likes are ready.", { exact: false }),
  ).toBeVisible();
  await expect(frame.locator("article").first()).toContainText(
    "Modern architecture",
  );
  await fresh.close();
});

test("missing widget acknowledgement times out without claiming likes were applied", async ({
  page,
  context,
}) => {
  const profile = addPreference(
    emptyProfile(),
    "Modern architecture",
    "design",
  );
  await context.addInitScript(
    (p) => localStorage.setItem("tastekey.profile.v1", JSON.stringify(p)),
    profile,
  );
  await page.goto("/integrations");
  await page.getByText("Try a sample widget", { exact: true }).click();
  const frame = page.frameLocator('iframe[title="Sample TasteKey widget"]');
  const opened = page.waitForEvent("popup");
  await frame
    .getByRole("button", { name: "Use my likes", exact: true })
    .click();
  const popup = await opened;
  await popup.clock.install();
  await popup
    .getByRole("checkbox", { name: "Modern architecture", exact: true })
    .check();
  await popup
    .getByRole("checkbox", { name: /Use only these selected likes/ })
    .check();
  await page.goto("/integrations");
  await popup.getByRole("button", { name: "Use selected likes" }).click();
  await popup.evaluate(() => {
    const q = new URLSearchParams(location.search);
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: location.origin,
        source: window,
        data: {
          type: "tastekey:likes-ack",
          widget: q.get("widget"),
          state: q.get("state"),
          status: "accepted",
        },
      }),
    );
  });
  await expect(
    popup.getByText("Your chosen likes are ready.", { exact: false }),
  ).toHaveCount(0);
  await popup.clock.fastForward(13000);
  await expect(popup.locator(".notice.error")).toContainText("did not confirm");
  await expect(
    popup.getByText("Your chosen likes are ready.", { exact: false }),
  ).toHaveCount(0);
  await popup.close();
});
