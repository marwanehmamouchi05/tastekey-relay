import { it, expect } from "vitest";
import { TravelQuoteSchema } from "../packages/shared-types";
import { eligibleQuotes } from "../packages/evaluation/travel";
const now = Date.parse("2026-10-27T12:00:00Z");
const quote = {
  id: crypto.randomUUID(),
  destinationId: "destination-one",
  destination: "Synthetic test destination",
  name: "Synthetic test accommodation",
  nightlyUSD: 60,
  source: "https://example.org/fixture",
  checkedAt: "2026-10-27T11:00:00Z",
  stayDate: "2026-11-01",
};
it("uses only fresh, matching, explicitly priced quotes within a local budget", () => {
  const rows = [
    quote,
    { ...quote, id: crypto.randomUUID(), nightlyUSD: 61 },
    { ...quote, id: crypto.randomUUID(), checkedAt: "2026-10-20T00:00:00Z" },
    { ...quote, id: crypto.randomUUID(), destinationId: "other" },
    { ...quote, id: crypto.randomUUID(), stayDate: "2026-10-26" },
    { ...quote, id: crypto.randomUUID(), checkedAt: "2026-10-28T12:00:00Z" },
  ];
  expect(eligibleQuotes(rows, ["destination-one"], 60, now)).toEqual([quote]);
  expect(eligibleQuotes([quote], ["destination-one"], 59, now)).toEqual([]);
});
it("rejects credential-bearing sources, invalid dates and fabricated negative prices", () => {
  expect(TravelQuoteSchema.safeParse(quote).success).toBe(true);
  for (const change of [
    { source: "javascript:alert(1)" },
    { source: "https://secret:password@example.org" },
    { nightlyUSD: -1 },
    { stayDate: "2026-02-31" },
  ])
    expect(TravelQuoteSchema.safeParse({ ...quote, ...change }).success).toBe(
      false,
    );
});
