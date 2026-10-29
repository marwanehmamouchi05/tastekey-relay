import type { Profile, Context, Preference } from "../shared-types";
/** Old saved edits may disagree with their reviewed provider identity. Never guess a replacement. */
export function hasCanonicalIdentity(node: Preference): boolean {
  return (
    !node.entity ||
    (node.label === node.entity.name && node.category === node.entity.category)
  );
}
export function isShareablePreference(p: Profile, n: Preference): boolean {
  return (
    ["stated", "confirmed"].includes(n.status) &&
    hasCanonicalIdentity(n) &&
    (!n.parentId ||
      p.nodes.some(
        (parent) =>
          parent.id === n.parentId &&
          ["stated", "confirmed"].includes(parent.status) &&
          hasCanonicalIdentity(parent),
      ))
  );
}
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
        isShareablePreference(p, n),
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
