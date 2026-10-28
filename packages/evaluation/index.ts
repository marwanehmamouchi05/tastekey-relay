export function hitAtK(ranking: string[], heldOut: string[], k = 3) {
  if (!heldOut.length) return null;
  return ranking.slice(0, k).some((id) => heldOut.includes(id)) ? 1 : 0;
}
export function evaluatePool(
  pool: string[],
  rankings: Record<string, string[]>,
  heldOut: string[],
) {
  if (!heldOut.length || heldOut.some((id) => !pool.includes(id)))
    throw new Error("Select held-out choices from the common candidate pool.");
  for (const ranking of Object.values(rankings))
    if (
      ranking.length !== pool.length ||
      new Set(ranking).size !== pool.length ||
      ranking.some((id) => !pool.includes(id))
    )
      throw new Error("All rankings must use the identical candidate pool.");
  return Object.fromEntries(
    Object.entries(rankings).map(([name, r]) => [
      name,
      {
        hitAt3: hitAtK(r, heldOut, 3),
        firstRelevantRank: r.findIndex((id) => heldOut.includes(id)) + 1,
      },
    ]),
  );
}

/** Retrospective positive-list metrics. Missing retrievals are zeros, never dropped. */
export function evaluateRetrospective(
  pool: string[],
  rankings: Record<string, string[]>,
  positiveIds: string[],
  k = 3,
) {
  if (!Number.isInteger(k) || k < 1) throw new Error("k must be positive.");
  if (!positiveIds.length || new Set(positiveIds).size !== positiveIds.length)
    throw new Error("Supply unique, nonempty held-out positive IDs.");
  if (new Set(pool).size !== pool.length)
    throw new Error("The candidate pool must contain unique IDs.");
  const positives = new Set(positiveIds);
  const retrieved = pool.filter((id) => positives.has(id)).length;
  const arms = Object.entries(rankings);
  if (!arms.length) throw new Error("Supply at least one ranking.");
  for (const [, ranking] of arms)
    if (
      ranking.length !== pool.length ||
      new Set(ranking).size !== pool.length ||
      ranking.some((id) => !pool.includes(id))
    )
      throw new Error("All rankings must use the identical candidate pool.");
  const ideal = Array.from(
    { length: Math.min(k, positives.size) },
    (_, i) => 1 / Math.log2(i + 2),
  ).reduce((a, b) => a + b, 0);
  return {
    positiveCount: positives.size,
    candidateCount: pool.length,
    retrievedPositiveCount: retrieved,
    retrievalRecall: retrieved / positives.size,
    metrics: Object.fromEntries(
      arms.map(([name, ranking]) => {
        const first = ranking.findIndex((id) => positives.has(id));
        const top = ranking.slice(0, k);
        const hits = top.filter((id) => positives.has(id)).length;
        const dcg = top.reduce(
          (sum, id, i) => sum + (positives.has(id) ? 1 / Math.log2(i + 2) : 0),
          0,
        );
        return [
          name,
          {
            hitAtK: hits > 0 ? 1 : 0,
            recallAtK: hits / positives.size,
            reciprocalRank: first < 0 ? 0 : 1 / (first + 1),
            ndcgAtK: dcg / ideal,
            firstRelevantRank: first < 0 ? null : first + 1,
          },
        ];
      }),
    ),
  };
}
