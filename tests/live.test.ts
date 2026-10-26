import { it, expect } from "vitest";
import { callQloo } from "../packages/qloo-adapter";
// Explicit opt-in: this consumes event quota. Default runs do not claim live coverage.
it.skipIf(process.env.QLOO_RUN_LIVE !== "1")(
  "real Qloo search and recommendations",
  async () => {
    const search = await callQloo("search", { query: "Interstellar" }, "movie");
    const exact = search.entities.filter(
      (e) => e.name.toLowerCase() === "interstellar",
    );
    expect(exact).toHaveLength(1);
    const insights = await callQloo(
      "insights",
      { entities: exact[0].id },
      "movie",
    );
    expect(insights.entities.length).toBeGreaterThan(0);
    expect(insights.source).toBe("qloo");
  },
  60000,
);
