import type {
  BusinessInput,
  Outcome,
  Strategy,
  Analysis,
  Trace,
} from "../shared-types";
import { assessOutcome } from "../shared-types";
import { callQloo } from "../qloo-adapter";
import { adviseStrategies } from "../agent-orchestrator";
export function baseline(b: BusinessInput): Strategy[] {
  return [
    {
      id: crypto.randomUUID(),
      title: `Run a small ${b.industry} experiment`,
      rationale: `Test one offering from your catalog against your stated objective: ${b.goal}. This is a planning rule based only on business inputs.`,
      evidenceIds: [],
      cost: Math.round(b.budget * 0.2),
      effort: "One small pilot",
      risks: "Demand is unknown; measure before expanding.",
      dependencies: `Owner approval; catalog availability; ${b.constraints || "confirm operating capacity"}`,
      nextAction:
        "Choose one existing offering, set a measurable target, and record the actual result.",
      status: "proposed",
      alignment: 0,
      source: "baseline",
    },
  ];
}
export async function analyze(
  b: BusinessInput,
  businessId: string,
  outcomes: Outcome[],
  noQloo = false,
  rejected: Strategy[] = [],
  useModel = false,
): Promise<Analysis> {
  const trace: Trace[] = [];
  const step = (state: string, tool: string, detail: string) =>
    trace.push({ state, tool, detail, at: new Date().toISOString() });
  step(
    "Understand",
    "business-profile",
    `${b.industry} in ${b.city}; budget ${b.budget} ${b.currency}.`,
  );
  const relevantOutcomes = outcomes.filter((o) => o.businessId === businessId);
  const lessons = [
    ...relevantOutcomes.map(
      (o) =>
        `${o.metric}: reported ${o.actual} against target ${o.expected} on ${o.date}. ${assessOutcome(o).label}. ${o.notes}`,
    ),
    ...rejected.map(
      (s) =>
        `Owner rejected ${s.title}. Constraint: ${s.revision || "No reason supplied; avoid repeating this proposal."}`,
    ),
  ];
  step(
    "Learn",
    "outcome-history",
    `${lessons.length} owner-reported outcomes reviewed; observations are not causal evidence.`,
  );
  const result: Analysis = {
    id: crypto.randomUUID(),
    businessId,
    input: b,
    createdAt: new Date().toISOString(),
    mode: noQloo ? "baseline" : "live",
    evidence: [],
    strategies: [],
    trace,
    limitations: [
      "Cultural affinity is aggregate evidence, not measured demand or a revenue forecast.",
      "Pilot costs are budget allocations chosen by a planning rule, not vendor quotes.",
      "Audience text and positioning are owner-provided context; they are not validated Qloo audience filters.",
    ],
    lessons,
    modelUsed: false,
  };
  if (noQloo) {
    result.strategies = baseline(b);
    step("Plan", "baseline-rule", "No Qloo or model data used.");
    return result;
  }
  try {
    if (!b.seeds.length)
      throw new Error(
        "Add at least one reviewed Qloo cultural reference in Business Setup.",
      );
    const category = {
      cinema: "movie",
      bookshop: "book",
      cafe: "place",
      retail: "brand",
      travel: "destination",
    }[b.industry] as "movie" | "book" | "place" | "brand" | "destination";
    step(
      "Investigate",
      "tool-selection",
      `Use cultural references as interest signals, ${b.city} as a location signal, and ${category} as the output category.`,
    );
    const evidence = await callQloo(
      "insights",
      { entities: b.seeds.map((s) => s.id).join(","), city: b.city },
      category,
    );
    result.evidence.push(evidence);
    step(
      "Evidence",
      evidence.tool,
      `${evidence.entities.length} entities returned${evidence.cached ? " from a five-minute cache" : ""}.`,
    );
    // Only explicit, direction-aware shortfalls affect this business's next pilot.
    const underTarget = relevantOutcomes.filter(
      (o) => assessOutcome(o).verdict === "shortfall",
    ).length;
    const allocation = underTarget ? 0.1 : 0.2;
    result.strategies = evidence.entities
      .filter(
        (entity) =>
          !rejected.some(
            (s) =>
              s.entityId === entity.id ||
              s.title === `Test an offering around ${entity.name}`,
          ),
      )
      .slice(0, 4)
      .map((entity, i) => ({
        id: crypto.randomUUID(),
        entityId: entity.id,
        title: `Test an offering around ${entity.name}`,
        rationale: `Qloo returned ${entity.name} for the selected cultural references and ${b.city} signal. Consider a ${b.industry} pilot using your catalog (${b.catalog}). Relevance to “${b.goal}” still needs owner review.${underTarget ? " Earlier missed targets favor a smaller pilot." : ""}`,
        evidenceIds: [evidence.id],
        cost: Math.floor((b.budget * allocation) / (i + 1)),
        effort:
          i === 0
            ? "Small pilot; review in one week"
            : "Validate supply and interest first",
        risks:
          "An aggregate affinity does not establish local demand. Confirm rights, supply, capacity, and fit with the intended audience.",
        dependencies: `${b.constraints || "Confirm capacity and operating constraints"}; validate fit for ${b.audience || "the intended audience"}. ${rejected
          .map((s) => s.revision)
          .filter(Boolean)
          .join("; ")}`,
        nextAction: `Validate access to ${entity.name}, select one measurable pilot, and set a target before launch.`,
        status: "proposed",
        alignment: entity.affinity ?? 0,
        source: "qloo-assisted",
      }));
    if (!result.strategies.length)
      result.limitations.push(
        "Qloo returned no entities for these inputs. Change the references or location and try again.",
      );
    step(
      "Constrain",
      "budget-rule",
      `Pilot allocations total ${result.strategies.reduce((a, s) => a + s.cost, 0)} ${b.currency}, within the declared budget. ${underTarget} prior outcomes missed an explicitly directed target.`,
    );
    step(
      "Recommend",
      "evidence-linked-planner",
      `${result.strategies.length} proposals created from Qloo entities using deterministic planning rules. No LLM reasoning is claimed.`,
    );
    if (useModel && result.strategies.length) {
      try {
        result.strategies = await adviseStrategies(
          b,
          result.evidence,
          result.strategies,
          lessons,
        );
        result.modelUsed = true;
        step(
          "Revise",
          "language-model",
          "Validated language-model strategy text. Evidence references and cost allocations remain controlled by code.",
        );
      } catch {
        result.limitations.push(
          "AI advisor could not complete; deterministic proposals are shown instead.",
        );
        step(
          "Revise",
          "language-model-unavailable",
          "No model-generated advice was substituted.",
        );
      }
    }
  } catch (err) {
    result.mode = "unavailable";
    result.error = err instanceof Error ? err.message : "Analysis unavailable.";
    step("Unavailable", "error", result.error);
  }
  return result;
}
