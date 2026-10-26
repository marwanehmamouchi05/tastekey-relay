import { afterEach, it, expect, vi } from "vitest";
import { interpretCorrection } from "../packages/agent-orchestrator";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function provider(output: unknown) {
  vi.stubEnv("MODEL_API_KEY", "synthetic-test-key");
  vi.stubEnv("MODEL_BASE_URL", "https://model.example/v1");
  vi.stubEnv("MODEL_NAME", "synthetic");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(output) } }],
        }),
      }),
  );
}
it("does not allow the model to invent a budget from affordable aesthetics", async () => {
  provider({
    label: "Luxury architecture",
    category: "design",
    budget: 500,
    budgetContext: "travel",
    explanation: "Proposed correction.",
  });
  const result = await interpretCorrection(
    "I love luxury architecture but choose affordable hotels.",
  );
  expect(result.label).toBe("Luxury architecture");
  expect(result.budget).toBeUndefined();
});
it("accepts an explicitly stated USD hotel limit", async () => {
  provider({
    budget: 60,
    budgetContext: "travel",
    explanation: "Explicit hotel limit.",
  });
  expect(
    (await interpretCorrection("My hotel budget is $60 a night.")).budget,
  ).toBe(60);
});
it("rejects negative budgets and unrecognized model categories", async () => {
  provider({ budget: -60, budgetContext: "travel", explanation: "Invalid" });
  await expect(interpretCorrection("Hotels for $60")).rejects.toThrow();
});
it("requires a configured provider instead of inventing a response", async () => {
  vi.stubEnv("MODEL_API_KEY", "");
  await expect(interpretCorrection("Correct my taste")).rejects.toThrow(
    "No language model",
  );
});
