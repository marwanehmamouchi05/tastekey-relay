// Development fixtures measure specified safety contracts, not human recommendation quality.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { rankByVerifiedMetadata } from "../packages/taste-engine";
import type { Entity, Preference } from "../packages/shared-types";
const preference: Preference = {
  id: "synthetic",
  label: "Emotional storytelling",
  category: "movie",
  status: "confirmed",
  evidence: [],
  updatedAt: "2026-10-29T00:00:00Z",
};
const e = (id: string, description = "", name = id): Entity => ({
  id,
  name,
  description,
  category: "movie",
  tags: [],
});
function old(pool: Entity[]) {
  return pool
    .map((entity, index) => ({
      entity,
      index,
      score: ["emotional", "storytelling"].filter((w) =>
        `${entity.name} ${entity.description || ""} ${entity.tags.join(" ")}`
          .toLowerCase()
          .includes(w),
      ).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.entity);
}
const cases = [
  { id: "substring", pool: [e("a"), e("b", "Unemotional storytelling")] },
  { id: "title-only", pool: [e("a"), e("b", "", "Emotional storytelling")] },
  { id: "partial-answer", pool: [e("a"), e("b", "Emotional spectacle")] },
  {
    id: "nearby-negation",
    pool: [e("a"), e("b", "Not emotional storytelling")],
  },
  {
    id: "distant-full-match",
    pool: Array.from({ length: 12 }, (_, i) =>
      e(String(i), i === 11 ? "Emotional storytelling" : ""),
    ),
  },
  {
    id: "adjacent-full-match",
    pool: [e("a"), e("b", "Emotional storytelling")],
  },
];
console.log(
  JSON.stringify(
    {
      at: new Date().toISOString(),
      kind: "synthetic-development-guardrail-measurements-not-relevance",
      sourceSha256: createHash("sha256")
        .update(readFileSync("packages/taste-engine/index.ts"))
        .digest("hex"),
      providerCalls: 0,
      modelCalls: 0,
      cases: cases.map((c) => {
        const before = old(c.pool),
          after = rankByVerifiedMetadata(c.pool, [preference]);
        const displacement = (list: Entity[]) =>
          Math.max(
            ...list.map((x, i) =>
              Math.abs(c.pool.findIndex((p) => p.id === x.id) - i),
            ),
          );
        return {
          id: c.id,
          providerOrder: c.pool.map((x) => x.id),
          legacyOrder: before.map((x) => x.id),
          revisedOrder: after.map((x) => x.id),
          legacyMaxDisplacement: displacement(before),
          revisedMaxDisplacement: displacement(after),
        };
      }),
      limitations:
        "Constructed metadata/ordering safety cases. No participant answers, human relevance or measured accuracy improvement.",
    },
    null,
    2,
  ),
);
