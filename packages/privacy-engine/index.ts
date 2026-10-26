import type { Profile, Context } from "../shared-types";
export const categories: Record<Context, string[]> = {
  entertainment: ["movie", "tv_show", "artist", "book"],
  shopping: ["brand", "design", "artist"],
  travel: ["destination", "place", "design", "artist", "movie", "book"],
};
export function authorizedContext(
  p: Profile,
  context: Context,
  now = Date.now(),
) {
  const grant = p.consents[context];
  if (
    !grant ||
    !Number.isFinite(Date.parse(grant.expiresAt)) ||
    Date.parse(grant.expiresAt) <= now
  )
    return { nodes: [], budget: undefined, allowed: false };
  return {
    nodes: p.nodes.filter(
      (n) =>
        grant.nodeIds.includes(n.id) &&
        categories[context].includes(n.category) &&
        ["stated", "confirmed"].includes(n.status),
    ),
    budget:
      context !== "entertainment" && grant.budget
        ? p.budgets[context]
        : undefined,
    allowed: true,
  };
}
export function revoke(p: Profile, context: Context): Profile {
  const consents = { ...p.consents };
  delete consents[context];
  return { ...p, consents };
}
export const aggregateMinimum = 10;
export function discloseAggregate(
  consented: boolean,
  samples: number,
  counts: Record<string, number>,
) {
  return consented && samples >= aggregateMinimum
    ? Object.fromEntries(
        Object.entries(counts).filter(([, n]) => n >= aggregateMinimum),
      )
    : null;
}
