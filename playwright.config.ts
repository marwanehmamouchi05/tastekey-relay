import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      APP_ORIGIN: "http://localhost:3000",
      TASTEKEY_DB_PATH: "../../test-results/browser.db",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
