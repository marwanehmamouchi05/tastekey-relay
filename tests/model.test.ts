import { afterEach, it, expect, vi } from "vitest";
import {
  interpretCorrection,
  modelConfigured,
} from "../packages/agent-orchestrator";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("expired model access is reported unavailable before any request", () => {
  provider({ explanation: "Not used" });
  vi.stubEnv("MODEL_ACCESS_EXPIRES", "2020-01-01T00:00:00Z");
  expect(modelConfigured()).toBe(false);
});
it("optional null fields from a real model do not invent a correction", async () => {
  provider({
    budget: null,
    category: null,
    label: null,
    budgetContext: null,
    explanation: "No numeric amount stated.",
  });
  expect(
    (await interpretCorrection("I prefer affordable hotels.")).budget,
  ).toBeUndefined();
});
function provider(output: unknown) {
  vi.stubEnv("MODEL_PROVIDER", "");
  vi.stubEnv("MODEL_API_KEY", "synthetic-test-key");
  vi.stubEnv("MODEL_BASE_URL", "https://model.example/v1");
  vi.stubEnv("MODEL_NAME", "synthetic");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
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
it("Bedrock uses a regional Converse request with a bounded output and preserves correction constraints", async () => {
  vi.stubEnv("MODEL_PROVIDER", "bedrock");
  vi.stubEnv("MODEL_REGION", "eu-west-3");
  vi.stubEnv("MODEL_NAME", "eu.amazon.nova-micro-v1:0");
  vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "synthetic-only");
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        stopReason: "end_turn",
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  budget: 60,
                  budgetContext: "travel",
                  explanation: "Explicit amount.",
                }),
              },
            ],
          },
        },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  expect(
    (await interpretCorrection("My hotel limit is $60 a night.")).budget,
  ).toBe(60);
  expect(fetch.mock.calls[0][0]).toBe(
    "https://bedrock-runtime.eu-west-3.amazonaws.com/model/eu.amazon.nova-micro-v1%3A0/converse",
  );
  expect(
    JSON.parse(fetch.mock.calls[0][1].body).inferenceConfig.maxTokens,
  ).toBe(600);
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
