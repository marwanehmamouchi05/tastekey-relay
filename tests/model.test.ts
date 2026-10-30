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
it.each([
  [
    "destination",
    "I love luxury architecture. My hotel budget is $60 a night.",
  ],
  ["art", "I love architecture. My hotel budget is $60 a night."],
  [
    "Luxury architecture",
    "I do not like luxury architecture. My hotel budget is $60 a night.",
  ],
  [
    "Luxury architecture",
    "Keep my luxury architecture taste. My hotel budget is $60 a night.",
  ],
])(
  "withholds an unsupported preference label %s while keeping an explicit budget",
  async (label, text) => {
    provider({
      label,
      category: "design",
      budget: 60,
      budgetContext: "travel",
      explanation: "Model interpretation.",
    });
    const proposal = await interpretCorrection(text);
    expect(proposal.label).toBeUndefined();
    expect(proposal.category).toBeUndefined();
    expect(proposal.budget).toBe(60);
  },
);
it("keeps a verbatim explicit positive preference without inventing a category from incomplete output", async () => {
  provider({
    label: "Luxury architecture",
    explanation: "Incomplete interpretation.",
  });
  const proposal = await interpretCorrection("I love luxury architecture.");
  expect(proposal.label).toBeUndefined();
});
it("does not attach a hotel amount to shopping when both contexts are mentioned", async () => {
  provider({
    budget: 60,
    budgetContext: "shopping",
    explanation: "Wrong spending context.",
  });
  expect(
    (
      await interpretCorrection(
        "My shopping budget is $20 per item. My hotel limit is $60 a night.",
      )
    ).budget,
  ).toBeUndefined();
});
it("withholds ambiguous spending amounts instead of choosing for the user", async () => {
  provider({
    budget: 60,
    budgetContext: "travel",
    explanation: "Ambiguous amount.",
  });
  expect(
    (await interpretCorrection("My hotel limit is $60 or $80 a night.")).budget,
  ).toBeUndefined();
});
it("rejects negative budgets and unrecognized model categories", async () => {
  provider({ budget: -60, budgetContext: "travel", explanation: "Invalid" });
  await expect(interpretCorrection("Hotels for $60")).rejects.toThrow();
});
it.each([
  ["shopping", 20.5],
  ["travel", 60],
] as const)(
  "keeps the explicit %s amount in separate spending clauses",
  async (budgetContext, budget) => {
    provider({
      budgetContext,
      budget,
      explanation: "Explicit separate limits.",
    });
    expect(
      (
        await interpretCorrection(
          "My shopping budget is $20.50 per item. My hotel limit is $60 a night.",
        )
      ).budget,
    ).toBe(budget);
  },
);
it("does not truncate a grouped amount into a different budget", async () => {
  provider({
    budgetContext: "travel",
    budget: 1,
    explanation: "Incorrect amount.",
  });
  expect(
    (await interpretCorrection("My hotel budget is $1,500 per night.")).budget,
  ).toBeUndefined();
});
it("withholds foreign-currency amounts", async () => {
  provider({
    budgetContext: "travel",
    budget: 60,
    explanation: "Wrong currency.",
  });
  expect(
    (await interpretCorrection("My hotel budget is CAD $60 a night.")).budget,
  ).toBeUndefined();
});
it("requires a configured provider instead of inventing a response", async () => {
  vi.stubEnv("MODEL_API_KEY", "");
  await expect(interpretCorrection("Correct my taste")).rejects.toThrow(
    "No language model",
  );
});

it("model slots preserve server IDs and reject changed evidence or omitted references", async () => {
  const { adviseStrategies } = await import("../packages/agent-orchestrator");
  const original = {
    id: "42c59a09-6ea7-4e28-81dc-a9c3788fa63d",
    entityId: "fixture-film",
    cost: 75,
    evidenceIds: ["fixture-evidence"],
    status: "proposed",
    title: "Baseline",
    rationale: "Baseline explanation",
  };
  const evidence = [
    {
      id: "fixture-evidence",
      tool: "synthetic fixture",
      entities: [
        {
          id: "fixture-film",
          name: "Fixture Film",
          category: "movie",
          affinity: 0.5,
          tags: [],
        },
      ],
    },
  ];
  provider({
    strategies: [
      {
        id: "0",
        title: "Ask about a discussion pilot",
        rationale:
          "Fixture Film suggests a topic to validate; demand is unknown.",
        nextAction:
          "Ask visitors to register interest before committing funds.",
        cost: 99999,
        evidenceIds: ["invented"],
        status: "accepted",
      },
    ],
  });
  const result = await adviseStrategies(
    { catalog: "Cinema discussions" } as any,
    evidence as any,
    [original] as any,
    [],
  );
  expect(result[0]).toMatchObject({
    id: original.id,
    entityId: "fixture-film",
    cost: 75,
    evidenceIds: ["fixture-evidence"],
    status: "proposed",
    title: "Ask about a discussion pilot",
  });
  expect(result[0].rationale).toContain("requires owner validation");
  const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as any).body);
  const input = JSON.parse(sent.messages[1].content);
  expect(input.strategies[0].id).toBe("0");
  expect(input.strategies[0].culturalReference).toBe("Fixture Film");
  expect(input.evidence[0]).not.toHaveProperty("entities");
  provider({
    strategies: [
      {
        id: "0",
        title: "Unrelated recommendation",
        rationale: "No supplied cultural reference is mentioned.",
        nextAction: "Ask for interest.",
      },
    ],
  });
  await expect(
    adviseStrategies({} as any, evidence as any, [original] as any, []),
  ).rejects.toThrow("assigned cultural reference");
  provider({
    strategies: [
      {
        id: "0",
        title: "First duplicate",
        rationale: "Fixture Film discussed.",
        nextAction: "Ask for interest.",
      },
      {
        id: "0",
        title: "Second duplicate",
        rationale: "Fixture Film discussed.",
        nextAction: "Ask for interest.",
      },
    ],
  });
  await expect(
    adviseStrategies(
      {} as any,
      evidence as any,
      [original, original] as any,
      [],
    ),
  ).rejects.toThrow("Invalid strategy IDs");
});
