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
