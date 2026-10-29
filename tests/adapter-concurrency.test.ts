import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");
  const fn = Object.assign(() => {}, { [promisify.custom]: mocks.execute });
  return { execFile: fn };
});
import { callQloo } from "../packages/qloo-adapter";
it("coalesces identical in-flight requests, caches success and retries after failure", async () => {
  const payload = {
    stdout: JSON.stringify([{ id: "fixture", name: "Fixture", tags: [] }]),
  };
  mocks.execute.mockResolvedValue(payload);
  const pair = await Promise.all([
    callQloo("search", { query: "coalesce-fixture" }, "movie"),
    callQloo("search", { query: "coalesce-fixture" }, "movie"),
  ]);
  expect(mocks.execute).toHaveBeenCalledTimes(1);
  expect(pair[0].id).toBe(pair[1].id);
  expect(
    (await callQloo("search", { query: "coalesce-fixture" }, "movie")).cached,
  ).toBe(true);
  mocks.execute.mockRejectedValueOnce({ stderr: "429" });
  await expect(
    callQloo("search", { query: "retry-fixture" }, "movie"),
  ).rejects.toMatchObject({ code: "QUOTA" });
  expect(
    (await callQloo("search", { query: "retry-fixture" }, "movie")).entities,
  ).toHaveLength(1);
  expect(mocks.execute).toHaveBeenCalledTimes(3);
});
