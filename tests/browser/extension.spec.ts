import { chromium } from "@playwright/test";
import { test, expect } from "./fixtures";
import { resolve } from "node:path";

test("unpacked extension loads with no broad site access, keeps chosen likes local and deletes them", async () => {
  const path = resolve("extension");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${path}`, `--load-extension=${path}`],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"));
    const extensionId = worker.url().split("/")[2];
    const permissions = await worker.evaluate(
      async () => await (globalThis as any).chrome.permissions.getAll(),
    );
    expect(permissions.origins || []).toEqual([]);
    expect(permissions.permissions).toEqual(
      expect.arrayContaining(["activeTab", "scripting", "storage"]),
    );
    const merchant = await context.newPage();
    await merchant.route("https://example.org/search", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: "<main><article><a href='/offer'>Synthetic architecture offer</a></article></main>",
      }),
    );
    await merchant.goto("https://example.org/search");
    const denied = await worker.evaluate(async () => {
      const chrome = (globalThis as any).chrome;
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.title,
        });
        return false;
      } catch {
        return true;
      }
    });
    expect(denied).toBe(true);
    await worker.evaluate(
      async () =>
        await (globalThis as any).chrome.storage.local.set({
          likes: [{ label: "Synthetic architecture", category: "design" }],
          selected: [],
        }),
    );
    const popup = await context.newPage();
    await popup.setViewportSize({ width: 360, height: 900 });
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(
      popup.getByRole("heading", { name: "Find what fits you" }),
    ).toBeVisible();
    const like = popup.getByRole("checkbox", {
      name: "Synthetic architecture",
      exact: true,
    });
    await expect(like).not.toBeChecked();
    await like.check();
    await expect
      .poll(
        async () =>
          (
            await worker.evaluate(
              async () =>
                await (globalThis as any).chrome.storage.local.get("selected"),
            )
          ).selected,
      )
      .toEqual([0]);
    await popup.screenshot({
      path: `${process.env.PLAYWRIGHT_SCREENSHOTS || "test-results/integrations"}/extension-popup.png`,
      fullPage: true,
    });
    await popup
      .getByRole("button", { name: "Delete copied likes", exact: true })
      .click();
    await expect(
      popup.getByText("Copied likes and settings deleted.", { exact: false }),
    ).toBeVisible();
    await expect(like).toHaveCount(0);
    expect(
      await worker.evaluate(
        async () => await (globalThis as any).chrome.storage.local.get(null),
      ),
    ).toEqual({});
  } finally {
    await context.close();
  }
});
