import { describe, it, expect } from "vitest";
import {
  emptyProfile,
  addPreference,
  verify,
  nextQuestion,
  removePreference,
  setBudget,
  rankByVerifiedMetadata,
} from "../packages/taste-engine";
import {
  authorizedContext,
  revoke,
  discloseAggregate,
} from "../packages/privacy-engine";
import { evaluatePool } from "../packages/evaluation";
const seeded = () =>
  addPreference(emptyProfile(), "Interstellar", "movie", {
    id: "movie-id",
    name: "Interstellar",
    category: "movie",
    tags: [],
  });
it("verification can rerank metadata matches while inferred and rejected tastes cannot", () => {
  const p = seeded();
  const q = nextQuestion(p)!;
  const option = q.options.find((n) => n.label === "Emotional storytelling")!;
  const pool = [
    {
      id: "a",
      name: "A",
      category: "movie" as const,
      description: "A factual journey",
      tags: [],
    },
    {
      id: "b",
      name: "B",
      category: "movie" as const,
      description: "Emotional storytelling across generations",
      tags: [],
    },
  ];
  expect(rankByVerifiedMetadata(pool, p.nodes).map((e) => e.id)).toEqual([
    "a",
    "b",
  ]);
  const confirmed = verify(p, q.parent.id, option.id);
  expect(
    rankByVerifiedMetadata(pool, confirmed.nodes).map((e) => e.id),
  ).toEqual(["b", "a"]);
  expect(
    rankByVerifiedMetadata(pool, verify(p, q.parent.id, null).nodes).map(
      (e) => e.id,
    ),
  ).toEqual(["a", "b"]);
});
describe("Personal state and verification", () => {
  it("preserves direct statement separately from uncertain interpretations", () => {
    const p = seeded();
    expect(p.nodes[0].status).toBe("stated");
    expect(p.nodes.slice(1).every((n) => n.status === "inferred")).toBe(true);
    expect(p.nodes.every((n) => n.evidence.length)).toBe(true);
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });
  it("chooses an unresolved question and confirms only the selected explanation", () => {
    const p = seeded();
    const q = nextQuestion(p)!;
    const v = verify(p, q.parent.id, q.options[0].id);
    expect(v.nodes.find((n) => n.id === q.options[0].id)?.status).toBe(
      "confirmed",
    );
    expect(v.nodes.filter((n) => n.status === "rejected")).toHaveLength(2);
    expect(nextQuestion(v)).toBeNull();
  });
  it("none of these rejects all possibilities without deleting the taste", () => {
    const p = seeded();
    const v = verify(p, p.nodes[0].id, null);
    expect(v.nodes[0].status).toBe("stated");
    expect(v.nodes.slice(1).every((n) => n.status === "rejected")).toBe(true);
  });
  it("prioritizes questions affecting authorized contexts", () => {
    let p = addPreference(seeded(), "Jazz", "artist");
    const second = p.nodes.find((n) => n.label === "Jazz")!;
    p.consents.entertainment = {
      context: "entertainment",
      nodeIds: [second.id],
      budget: false,
      expiresAt: new Date(Date.now() + 100000).toISOString(),
    };
    expect(nextQuestion(p)?.parent.id).toBe(second.id);
  });
  it("changing hotel budget preserves luxury aesthetics and unrelated movie taste", () => {
    let p = addPreference(seeded(), "Luxury architecture", "design");
    const before = p.nodes;
    p = setBudget(p, "travel", 60);
    expect(p.nodes).toEqual(before);
    expect(p.budgets.travel).toBe(60);
    expect(p.nodes.some((n) => n.label === "Luxury architecture")).toBe(true);
    expect(p.nodes.some((n) => n.label === "Interstellar")).toBe(true);
  });
});
describe("Context isolation", () => {
  const grant = () => {
    const p = addPreference(seeded(), "Luxury architecture", "design");
    p.budgets.travel = 60;
    p.consents.entertainment = {
      context: "entertainment",
      nodeIds: p.nodes.map((n) => n.id),
      budget: true,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };
    return p;
  };
  it("entertainment cannot expose spending or unrelated design", () => {
    const value = authorizedContext(grant(), "entertainment");
    expect(value.budget).toBeUndefined();
    expect(value.nodes).toHaveLength(1);
    expect(value.nodes[0].category).toBe("movie");
  });
  it("revocation prevents future context access", () => {
    const p = revoke(grant(), "entertainment");
    expect(authorizedContext(p, "entertainment")).toEqual({
      nodes: [],
      budget: undefined,
      allowed: false,
    });
  });
  it("expiry prevents access", () => {
    expect(
      authorizedContext(grant(), "entertainment", Date.now() + 120000).allowed,
    ).toBe(false);
  });
  it("deleting a reference deletes children and removes it from grants", () => {
    const p = grant();
    const id = p.nodes[0].id;
    const value = removePreference(p, id);
    expect(value.nodes.some((n) => n.id === id || n.parentId === id)).toBe(
      false,
    );
    expect(value.consents.entertainment!.nodeIds.includes(id)).toBe(false);
  });
  it("empty profile contains no preferences or grants", () => {
    expect(emptyProfile()).toEqual({
      version: 1,
      nodes: [],
      consents: {},
      budgets: {},
      history: [],
    });
  });
  it("suppresses small or unconsented audiences and small cells", () => {
    expect(discloseAggregate(false, 100, { film: 100 })).toBeNull();
    expect(discloseAggregate(true, 9, { film: 9 })).toBeNull();
    expect(discloseAggregate(true, 20, { film: 12, music: 8 })).toEqual({
      film: 12,
    });
  });
});
describe("Evaluation uses real selections and identical pools", () => {
  it("refuses mismatched pools and missing ground truth", () => {
    expect(() => evaluatePool(["a", "b"], { a: ["a"] }, ["b"])).toThrow();
    expect(() => evaluatePool(["a"], { a: ["a"] }, [])).toThrow();
  });
  it("calculates observed hit and rank without inventing improvement", () => {
    expect(
      evaluatePool(
        ["a", "b", "c", "d"],
        { baseline: ["a", "b", "c", "d"], qloo: ["d", "c", "b", "a"] },
        ["d"],
      ),
    ).toEqual({
      baseline: { hitAt3: 0, firstRelevantRank: 4 },
      qloo: { hitAt3: 1, firstRelevantRank: 1 },
    });
  });
});
