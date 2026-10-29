import { expect, it } from "vitest";
import { assessOutcome, OutcomeInput } from "../packages/shared-types";
it.each([
  ["higher-is-better", 0, 0, "met"],
  ["lower-is-better", 0, 0, "met"],
  ["lower-is-better", 0, 1, "shortfall"],
  ["higher-is-better", 0, 1, "met"],
  ["higher-is-better", 10, 5, "shortfall"],
  ["lower-is-better", 10, 5, "met"],
  ["lower-is-better", 10, 20, "shortfall"],
  ["observe-only", 10, 5, "observed"],
  [undefined, 10, 5, "observed"],
  ["unknown", 10, 5, "observed"],
])(
  "assesses %s target %s actual %s as %s",
  (direction, expected, actual, verdict) => {
    expect(
      assessOutcome({ direction: direction as any, expected, actual }).verdict,
    ).toBe(verdict);
  },
);
it("defaults omitted direction conservatively and rejects invalid API input", () => {
  const input = {
    actionId: "a",
    metric: "Cost per booking",
    expected: 10,
    actual: 5,
    date: "2026-10-29",
    notes: "",
  };
  expect(OutcomeInput.parse(input).direction).toBe("observe-only");
  expect(
    OutcomeInput.safeParse({ ...input, direction: "guessed-from-metric" })
      .success,
  ).toBe(false);
});
