import type { TravelQuote } from "../shared-types";
export function eligibleQuotes(
  quotes: TravelQuote[],
  destinationIds: string[],
  budget?: number,
  now = Date.now(),
) {
  return quotes
    .filter(
      (q) =>
        destinationIds.includes(q.destinationId) &&
        Date.parse(q.checkedAt) <= now &&
        now - Date.parse(q.checkedAt) <= 48 * 3600000 &&
        q.stayDate >= new Date(now).toISOString().slice(0, 10) &&
        (budget === undefined || q.nightlyUSD <= budget),
    )
    .sort((a, b) => a.nightlyUSD - b.nightlyUSD);
}
