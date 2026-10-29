import { it, expect, vi, describe } from "vitest";
import type { BusinessInput, Outcome, Entity } from "../packages/shared-types";
const call = vi.hoisted(() => vi.fn());
vi.mock("../packages/qloo-adapter", () => ({ callQloo: call }));
import { analyze } from "../packages/studio-engine";
const business: BusinessInput = {
  name: "Test cinema",
  industry: "cinema",
  city: "Casablanca",
  catalog: "Independent screenings",
  audience: "Local cinema visitors",
  positioning: "Community cinema",
  competitors: "",
  goal: "Test weekly attendance",
  budget: 1000,
  currency: "MAD",
  constraints: "One evening per week",
  seeds: [
    { id: "fixture-seed", name: "Test reference", category: "movie", tags: [] },
  ],
};
const fixture = (city = "Casablanca") => ({
  id: "fixture-evidence",
  source: "qloo",
  tool: "qloo api insights",
  inputs: { city },
  at: "2026-10-26T00:00:00Z",
  cached: false,
  entities: [
    {
      id: "fixture-a",
      name: "Fixture film A",
      category: "movie",
      affinity: 0.3,
      tags: [],
    },
    {
      id: "fixture-b",
      name: "Fixture film B",
      category: "movie",
      affinity: 0.2,
      tags: [],
    },
  ],
});
describe("Studio workflow with explicitly synthetic fixture transport", () => {
  it("does not cut a pilot allocation when a lower-is-better cost beats target", async () => {
    call.mockResolvedValue(fixture());
    const outcome = {
      id: "cost-result",
      businessId: "b",
      actionId: "a",
      metric: "Cost per booking",
      direction: "lower-is-better",
      actual: 5,
      expected: 10,
      date: "2026-10-29",
      notes: "Owner reported",
    } as Outcome;
    expect((await analyze(business, "b", [outcome])).strategies[0].cost).toBe(
      200,
    );
  });
  it("links proposals to supplied evidence and stays within budget", async () => {
    call.mockResolvedValueOnce(fixture());
    const a = await analyze(business, "test-business", []);
    expect(a.mode).toBe("live");
    expect(a.strategies).toHaveLength(2);
    expect(
      a.strategies.every((s) => s.evidenceIds.includes("fixture-evidence")),
    ).toBe(true);
    expect(a.strategies.reduce((v, s) => v + s.cost, 0)).toBeLessThanOrEqual(
      business.budget,
    );
    expect(a.modelUsed).toBe(false);
  });
  it("changed city triggers a changed Qloo location signal", async () => {
    call.mockResolvedValue(fixture());
    await analyze({ ...business, city: "Rabat" }, "test-business", []);
    expect(call).toHaveBeenLastCalledWith(
      "insights",
      expect.objectContaining({ city: "Rabat" }),
      "movie",
    );
  });
  it("budget scenario recomputes allocations using the same evidence", async () => {
    call.mockResolvedValue(fixture());
    const a = await analyze(business, "b", []);
    const b = await analyze({ ...business, budget: 100 }, "b", []);
    expect(a.strategies[0].cost).toBe(200);
    expect(b.strategies[0].cost).toBe(20);
  });
  it("reported below-target outcomes reduce future pilot allocations", async () => {
    call.mockResolvedValue(fixture());
    const o = {
      metric: "Attendance",
      businessId: "b",
      direction: "higher-is-better",
      actual: 12,
      expected: 30,
      date: "2026-10-26",
      notes: "Rain",
    } as Outcome;
    const a = await analyze(business, "b", [o]);
    expect(a.strategies[0].cost).toBe(100);
    expect(a.lessons[0]).toContain("reported 12");
  });
  it.each([
    ["lower-is-better", 5, 200],
    ["lower-is-better", 20, 100],
    ["lower-is-better", 10, 200],
    ["higher-is-better", 5, 100],
    ["higher-is-better", 20, 200],
    ["observe-only", 5, 200],
    [undefined, 5, 200],
  ])(
    "uses explicit %s direction for actual %s (including legacy records)",
    async (direction, actual, allocation) => {
      call.mockResolvedValue(fixture());
      const o = {
        id: "o",
        businessId: "b",
        actionId: "a",
        metric: "Owner metric",
        direction,
        actual,
        expected: 10,
        date: "2026-10-29",
        notes: "",
      } as Outcome;
      expect(
        (await analyze(business, "b", [JSON.parse(JSON.stringify(o))]))
          .strategies[0].cost,
      ).toBe(allocation);
    },
  );
  it("does not use another business's missed targets", async () => {
    call.mockResolvedValue(fixture());
    const o = {
      id: "o",
      businessId: "other",
      actionId: "a",
      metric: "Attendance",
      direction: "higher-is-better",
      actual: 0,
      expected: 10,
      date: "2026-10-29",
      notes: "",
    } as Outcome;
    const a = await analyze(business, "b", [o]);
    expect(a.strategies[0].cost).toBe(200);
    expect(a.lessons).toEqual([]);
  });
  it("excludes rejected proposals and preserves the rejection reason", async () => {
    call.mockResolvedValue(fixture());
    const a = await analyze(business, "b", []);
    const rejected = {
      ...a.strategies[0],
      status: "rejected" as const,
      revision: "Unavailable screening license",
    };
    const b = await analyze(business, "b", [], false, [rejected]);
    expect(b.strategies).toHaveLength(1);
    expect(b.lessons[0]).toContain("Unavailable screening license");
    expect(b.strategies[0].dependencies).toContain(
      "Unavailable screening license",
    );
  });
  it("records an honest failure with no fabricated insights", async () => {
    call.mockRejectedValueOnce(new Error("Quota reached"));
    const a = await analyze(business, "b", []);
    expect(a.mode).toBe("unavailable");
    expect(a.strategies).toEqual([]);
    expect(a.evidence).toEqual([]);
    expect(a.error).toBe("Quota reached");
  });
  it("does not silently auto-resolve missing references", async () => {
    const a = await analyze({ ...business, seeds: [] }, "b", []);
    expect(a.mode).toBe("unavailable");
    expect(a.error).toContain("reviewed Qloo");
  });
  it("baseline uses the business brief and no Qloo data", async () => {
    call.mockClear();
    const a = await analyze(business, "b", [], true);
    expect(call).not.toHaveBeenCalled();
    expect(a.mode).toBe("baseline");
    expect(a.strategies[0].evidenceIds).toEqual([]);
  });
});
