import { expect, it } from "vitest";
import {
  addPreference,
  emptyProfile,
  nextQuestion,
  rankByVerifiedMetadata,
  verify,
  recommendationCandidates,
} from "../packages/taste-engine";
import type { Entity, Preference } from "../packages/shared-types";
const answer = (label = "Emotional storytelling"): Preference => ({
  id: "answer",
  label,
  category: "movie",
  status: "confirmed",
  evidence: [],
  updatedAt: new Date().toISOString(),
});
const item = (id: string, description = "", name = id): Entity => ({
  id,
  name,
  description,
  category: "movie",
  tags: [],
});
it("new suggestions omit exact seed IDs and duplicates, preserving distinct remakes and provider order", () => {
  const pool = [
    item("seed"),
    item("new", "", "Same title"),
    item("new"),
    item("remake", "", "Same title"),
  ];
  expect(recommendationCandidates(pool, ["seed"]).map((e) => e.id)).toEqual([
    "new",
    "remake",
  ]);
  expect(pool).toHaveLength(4);
});
it("weak words, title coincidences, partial matches and nearby negation abstain", () => {
  for (const b of [
    item("b", "", "Emotional storytelling"),
    item("b", "Unemotional storytelling"),
    item("b", "Emotional spectacle"),
    item("b", "Not emotional storytelling"),
  ])
    expect(
      rankByVerifiedMetadata([item("a"), b], [answer()]).map((e) => e.id),
    ).toEqual(["a", "b"]);
});
it("a full confirmed hint promotes locally but cannot replace the provider prior", () => {
  const pool = Array.from({ length: 12 }, (_, i) =>
    item(String(i), i >= 4 ? "Emotional storytelling" : ""),
  );
  const result = rankByVerifiedMetadata(pool, [answer(), answer()]);
  for (let i = 0; i < result.length; i++)
    expect(Math.abs(Number(result[i].id) - i)).toBeLessThanOrEqual(1);
  expect(result.map((e) => e.id).slice(0, 3)).toEqual(["0", "1", "2"]);
  expect(
    rankByVerifiedMetadata(
      [item("a"), item("b", "Emotional storytelling")],
      [answer()],
    ).map((e) => e.id),
  ).toEqual(["b", "a"]);
});
it("unconfirmed, rejected or canonical entity labels cannot become metadata hints", () => {
  const pool = [item("a"), item("b", "Emotional storytelling")];
  for (const p of [
    { ...answer(), status: "inferred" as const },
    { ...answer(), status: "rejected" as const },
    { ...answer(), entity: item("ref") },
  ])
    expect(rankByVerifiedMetadata(pool, [p]).map((e) => e.id)).toEqual([
      "a",
      "b",
    ]);
});
it("one answer is not a rejection of other reasons; invalid choices leave uncertainty untouched", () => {
  const p = addPreference(emptyProfile(), "Fixture", "movie");
  const q = nextQuestion(p)!;
  expect(verify(p, q.parent.id, "foreign-node")).toBe(p);
  const v = verify(p, q.parent.id, q.options[0].id);
  expect(v.nodes.filter((n) => n.status === "inferred")).toHaveLength(2);
  expect(v.nodes.filter((n) => n.status === "rejected")).toHaveLength(0);
  expect(nextQuestion(v)).toBeNull();
});
it("does not ask about a rejected parent or prioritize expired grants", () => {
  let p = addPreference(
    addPreference(emptyProfile(), "First", "movie"),
    "Second",
    "movie",
  );
  const second = p.nodes.find((n) => n.label === "Second")!;
  p.consents.entertainment = {
    context: "entertainment",
    nodeIds: [second.id],
    budget: false,
    expiresAt: "2020-01-01T00:00:00Z",
  };
  expect(nextQuestion(p)?.parent.label).toBe("First");
  p = {
    ...p,
    nodes: p.nodes.map((n) =>
      n.label === "First" ? { ...n, status: "rejected" as const } : n,
    ),
  };
  expect(nextQuestion(p)?.parent.label).toBe("Second");
});
