import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { configured } from "../packages/qloo-adapter/index";
import { analyze } from "../packages/studio-engine/index";
import type { Analysis, BusinessInput } from "../packages/shared-types/index";
import {
  freezeProtocol,
  resolveExactSeed,
  sha256,
} from "./evaluate-public-profiles";

const common = {
  city: "Paris",
  audience:
    "Local visitors; synthetic planning scenario, not a measured audience",
  positioning: "Small independent business",
  competitors: "Not supplied",
  constraints:
    "One staff member; confirm rights, supply and capacity before launch",
  seeds: [],
};
const cases: BusinessInput[] = [
  {
    ...common,
    name: "Synthetic cinema",
    industry: "cinema",
    catalog: "One weekly film screening",
    goal: "Plan one small screening pilot",
    budget: 1000,
    currency: "EUR",
  },
  {
    ...common,
    name: "Synthetic bookshop",
    industry: "bookshop",
    catalog: "Existing books and one reading table",
    goal: "Plan a book discussion using existing stock",
    budget: 3000,
    currency: "MAD",
  },
  {
    ...common,
    name: "Synthetic retailer",
    industry: "retail",
    catalog: "Existing stationery display",
    goal: "Plan a display without new spending",
    budget: 0,
    currency: "USD",
  },
];

function measure(analysis: Analysis) {
  const evidenceIds = new Set(analysis.evidence.map((item) => item.id));
  const entityIds = new Set(
    analysis.evidence.flatMap((item) =>
      item.entities.map((entity) => entity.id),
    ),
  );
  const proposals = analysis.strategies;
  const totalAllocated = proposals.reduce(
    (sum, proposal) => sum + proposal.cost,
    0,
  );
  return {
    mode: analysis.mode,
    apiAvailable: analysis.mode !== "unavailable",
    proposalCount: proposals.length,
    evidenceCount: analysis.evidence.length,
    returnedEntityCount: entityIds.size,
    totalAllocated,
    declaredBudget: analysis.input.budget,
    currency: analysis.input.currency,
    nonnegativeFiniteCosts: proposals.every(
      (p) => Number.isFinite(p.cost) && p.cost >= 0,
    ),
    withinDeclaredBudget: totalAllocated <= analysis.input.budget,
    linkedProposalCount: proposals.filter(
      (p) =>
        p.evidenceIds.length > 0 &&
        p.evidenceIds.every((id) => evidenceIds.has(id)) &&
        Boolean(p.entityId && entityIds.has(p.entityId)),
    ).length,
    danglingEvidenceReferenceCount: proposals
      .flatMap((p) => p.evidenceIds)
      .filter((id) => !evidenceIds.has(id)).length,
    proposalsWithDependencies: proposals.filter((p) =>
      Boolean(p.dependencies.trim()),
    ).length,
    proposalsWithNextAction: proposals.filter((p) =>
      Boolean(p.nextAction.trim()),
    ).length,
    modelUsed: analysis.modelUsed,
    error: analysis.error,
    caveat:
      "Empty proposal sets make boolean allocation checks vacuously true; inspect mode and proposal count. Mechanical contracts are not usefulness or demand ratings.",
  };
}

async function main() {
  const protocol = {
    kind: "synthetic-studio-mechanical-ablation",
    createdAt: new Date().toISOString(),
    sourceScriptSha256: sha256(
      readFileSync(fileURLToPath(import.meta.url), "utf8"),
    ),
    productionEngineSha256: sha256(
      readFileSync(
        new URL("../packages/studio-engine/index.ts", import.meta.url),
        "utf8",
      ),
    ),
    cases,
    reference: {
      title: "Interstellar",
      sourceYear: 2014,
      director: "Christopher Nolan",
      aliases: [],
    },
    maximumAdapterCalls: 4,
    upstreamAttempts:
      "At most eight with production transient-error retry; one seed search, three category investigations.",
    arms: [
      "business-input-only baseline",
      "Qloo-assisted deterministic planner",
    ],
    useModel: false,
    limitation:
      "Synthetic inputs, no customers, no human quality ratings, no sales observations. Baseline zero evidence and fewer proposals are by design, not measures of inferior quality. Seed matching is provisional title-only; year/director are not verified.",
  };
  if (!process.argv.includes("--live")) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          protocol,
          instruction:
            "Add --live to opt into four sequential production Qloo adapter calls. No API was called.",
        },
        null,
        2,
      ),
    );
    return;
  }
  const frozen = freezeProtocol("studio", protocol);
  const rows: any[] = [];
  const output = {
    protocolFile: `${frozen.prefix}.protocol.json`,
    protocolSha256: frozen.protocolSha256,
    cases: rows,
  };
  const save = () =>
    writeFileSync(
      `${frozen.prefix}.json`,
      `${JSON.stringify(output, null, 2)}\n`,
    );
  save();
  if (!(await configured()))
    throw new Error("Qloo is not configured; frozen protocol retained.");
  const seed = await resolveExactSeed(protocol.reference);
  if (!seed.entity)
    throw new Error(
      "Synthetic reference missing or ambiguous; no investigation calls made.",
    );
  for (const [index, input] of cases.entries()) {
    const business = { ...input, seeds: [seed.entity] };
    const baseline = await analyze(
      business,
      `synthetic-${index}`,
      [],
      true,
      [],
      false,
    );
    const assisted = await analyze(
      business,
      `synthetic-${index}`,
      [],
      false,
      [],
      false,
    );
    const minimize = (analysis: Analysis) => ({
      id: analysis.id,
      createdAt: analysis.createdAt,
      mode: analysis.mode,
      evidence: analysis.evidence.map((e) => ({
        id: e.id,
        at: e.at,
        cached: e.cached,
        inputs: e.inputs,
        entities: e.entities.map(({ id, name, category, affinity }) => ({
          id,
          name,
          category,
          affinity,
        })),
      })),
      strategies: analysis.strategies,
      trace: analysis.trace,
      limitations: analysis.limitations,
      error: analysis.error,
    });
    rows.push({
      case: index + 1,
      input: {
        ...input,
        seeds: [
          {
            id: seed.entity.id,
            name: seed.entity.name,
            category: seed.entity.category,
          },
        ],
      },
      seedResolution: seed.audit,
      baseline: { metrics: measure(baseline), evidence: minimize(baseline) },
      qlooAssisted: {
        metrics: measure(assisted),
        evidence: minimize(assisted),
      },
    });
    save();
  }
  console.table(
    rows.flatMap((row) =>
      ["baseline", "qlooAssisted"].map((arm) => ({
        case: row.case,
        arm,
        ...row[arm].metrics,
      })),
    ),
  );
  console.log(`Evidence: ${frozen.prefix}.json`);
  if (rows.some((row) => row.qlooAssisted.metrics.mode === "unavailable"))
    process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Studio evaluation failed.",
  );
  process.exitCode = 1;
});
