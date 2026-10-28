import { test, expect } from "./fixtures";

test("five concurrent local demo journeys keep business records isolated", async ({
  playwright,
}, info) => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "Bounded concurrency check uses disposable local storage and no provider calls.",
  );
  const origin = "http://localhost:3000";
  const started = performance.now();
  const results = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const client = await playwright.request.newContext({
        baseURL: origin,
        extraHTTPHeaders: { Origin: origin },
      });
      const at = performance.now();
      try {
        expect((await client.post("/api/session")).ok()).toBe(true);
        const input = {
          name: `Synthetic concurrent cinema ${i}`,
          industry: "cinema",
          city: "Casablanca",
          catalog: "One screening",
          audience: "",
          positioning: "",
          competitors: "",
          goal: "A small test",
          budget: 100,
          currency: "MAD",
          constraints: "Test fixture",
          seeds: [],
        };
        const saved = await client.post("/api/business", { data: { input } });
        expect(saved.ok()).toBe(true);
        const business = await saved.json();
        const response = await client.post("/api/analysis", {
          data: { businessId: business.id, baseline: true },
        });
        expect(response.ok()).toBe(true);
        expect((await response.json()).mode).toBe("baseline");
        const records = await (await client.get("/api/workspace")).json();
        expect(records.businesses).toHaveLength(1);
        expect(records.businesses[0].name).toBe(input.name);
        expect(records.analyses).toHaveLength(1);
        return {
          journey: i + 1,
          elapsedMs: Math.round(performance.now() - at),
          isolated: true,
        };
      } finally {
        await client.delete("/api/workspace");
        await client.dispose();
      }
    }),
  );
  await info.attach("bounded-local-concurrency", {
    body: JSON.stringify(
      {
        concurrency: 5,
        totalElapsedMs: Math.round(performance.now() - started),
        results,
        providerCalls: 0,
        limitation:
          "Local API baseline journeys only; not a production load or live provider capacity benchmark.",
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});
