import { describe, expect, it } from "vitest";
import { evaluateRetrospective } from "../../packages/evaluation";

describe("Retrospective positive-list metrics", () => {
  it("retains positives outside the pool as retrieval and ranking misses", () => {
    const result = evaluateRetrospective(
      ["a", "b", "c"],
      { qloo: ["a", "b", "c"] },
      ["b", "outside"],
    );
    expect(result.retrievalRecall).toBe(0.5);
    expect(result.metrics.qloo.hitAtK).toBe(1);
    expect(result.metrics.qloo.recallAtK).toBe(0.5);
    expect(result.metrics.qloo.reciprocalRank).toBe(0.5);
    expect(result.metrics.qloo.ndcgAtK).toBeCloseTo(
      1 / Math.log2(3) / (1 + 1 / Math.log2(3)),
    );
  });
  it("scores empty retrieval and all-miss pools zero without dropping the case", () => {
    for (const pool of [[], ["unrelated"]]) {
      const result = evaluateRetrospective(pool, { qloo: pool }, ["missing"]);
      expect(result.retrievalRecall).toBe(0);
      expect(result.metrics.qloo).toEqual({
        hitAtK: 0,
        recallAtK: 0,
        reciprocalRank: 0,
        ndcgAtK: 0,
        firstRelevantRank: null,
      });
    }
  });
  it("normalizes nDCG by all held-out positives, including unreturned items", () => {
    const result = evaluateRetrospective(
      ["a", "b", "c", "d"],
      { ideal: ["a", "b", "c", "d"], reverse: ["d", "c", "b", "a"] },
      ["a", "b"],
    );
    expect(result.metrics.ideal.ndcgAtK).toBe(1);
    expect(result.metrics.reverse.hitAtK).toBe(1);
    expect(result.metrics.reverse.reciprocalRank).toBeCloseTo(1 / 3);
    expect(result.metrics.reverse.ndcgAtK).toBeLessThan(1);
  });
  it("rejects invalid denominators, duplicate IDs and unequal comparison pools", () => {
    expect(() => evaluateRetrospective(["a"], { x: ["a"] }, [])).toThrow();
    expect(() =>
      evaluateRetrospective(["a"], { x: ["a"] }, ["b", "b"]),
    ).toThrow();
    expect(() =>
      evaluateRetrospective(["a", "a"], { x: ["a", "a"] }, ["b"]),
    ).toThrow();
    expect(() =>
      evaluateRetrospective(["a", "b"], { x: ["a", "a"] }, ["a"]),
    ).toThrow();
    expect(() => evaluateRetrospective(["a"], {}, ["b"])).toThrow();
    expect(() => evaluateRetrospective([], { x: [] }, ["b"], 0)).toThrow();
  });
});
