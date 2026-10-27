import { test as base, expect } from "@playwright/test";
// Public verification respects the production session-creation limit (10/minute).
// The local test server has its own explicitly configured allowance.
export const test = base.extend<{ productionPacing: void }>({
  productionPacing: [
    async ({}, use) => {
      if (process.env.PLAYWRIGHT_BASE_URL)
        await new Promise((resolve) => setTimeout(resolve, 8000));
      await use();
    },
    { auto: true },
  ],
});
export { expect };
