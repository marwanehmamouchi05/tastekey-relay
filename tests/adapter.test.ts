import { it, expect } from "vitest";
import {
  normalizeEntities,
  qlooReadyFromStatus,
} from "../packages/qloo-adapter";
const entity = {
  entity_id: "fixture-only-id",
  name: "Synthetic fixture film",
  subtype: "urn:entity:movie",
  query: { affinity: 0.75 },
  properties: { description: "Test fixture, not a recorded live response." },
};
it("recognizes Qloo readiness independently of optional chat model setup", () => {
  expect(
    qlooReadyFromStatus("Qloo data: ready (config)\nModel: not configured"),
  ).toBe(true);
  expect(
    qlooReadyFromStatus("Qloo data: learning mode; no API credential"),
  ).toBe(false);
});
it("normalizes the actual harness JSON array format", () => {
  expect(normalizeEntities([entity], "movie")[0]).toMatchObject({
    id: "fixture-only-id",
    affinity: 0.75,
  });
});
it("also accepts raw Insights response envelopes", () => {
  expect(
    normalizeEntities({ results: { entities: [entity] } }, "movie")[0].name,
  ).toBe(entity.name);
});
it("does not accept a malformed response as empty success", () => {
  expect(() => normalizeEntities({ success: false }, "movie")).toThrow();
});
