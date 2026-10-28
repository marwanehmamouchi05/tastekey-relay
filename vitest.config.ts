import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  resolve: {
    alias: {
      "next/server": resolve("apps/web/node_modules/next/server.js"),
      "@tastekey/shared-types": resolve("packages/shared-types/index.ts"),
    },
  },
});
