// Frozen diagnostic protocol. Public positive lists are not participants or human satisfaction labels.
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { callQloo } from "../packages/qloo-adapter/index";
import { evaluateRetrospective } from "../packages/evaluation/index";
import { rankByVerifiedMetadata } from "../packages/taste-engine/index";
import {
  freezeProtocol,
  normalizeTitle,
  sha256,
} from "./evaluate-public-profiles";
import type { Entity, Preference } from "../packages/shared-types";
const sourceUrl =
  "https://www.bfi.org.uk/sight-and-sound/polls/best-films-2022-all-votes";
const cases = [
  {
    id: "jason-anderson-annual-2022",
    titles: [
      "Aftersun",
      "EO",
      "The Fabelmans",
      "Compartment No. 6",
      "Flux Gourmet",
      "Kimi",
      "Nope",
      "Viking",
      "I Have Electric Dreams",
      "Geographies of Solitude",
    ],
  },
  {
    id: "michael-atkinson-annual-2022",
    titles: [
      "Vortex",
      "Crimes of the Future",
      "Hit the Road",
      "Aftersun",
      "Playground",
      "Brighton 4th",
      "No Bears",
      "TÁR",
      "Apollo 10½: A Space Age Childhood",
      "Intergalde",
    ],
  },
];
const editorial = [
  "Aftersun",
  "Saint Omer",
  "Decision to Leave",
  "The Banshees of Inisherin",
  "Nope",
  "All the Beauty and the Bloodshed",
  "One Fine Morning",
  "EO",
  "RRR",
  "TÁR",
  "Corsage",
  "Pacifiction",
];
const answer: Preference = {
  id: "simulated",
  label: "Emotional storytelling",
  category: "movie",
  status: "confirmed",
  evidence: [],
  updatedAt: "2026-10-29T00:00:00Z",
};
function legacy(pool: Entity[]) {
  return pool
    .map((entity, index) => ({
      entity,
      index,
      score: ["emotional", "storytelling"].filter((w) =>
        `${entity.name} ${entity.description || ""} ${entity.tags.join(" ")}`
          .toLowerCase()
          .includes(w),
      ).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((e) => e.entity);
}
const protocol = {
  createdAt: new Date().toISOString(),
  kind: "fresh-annual-public-list-proxy-not-human-study",
  sourceUrl,
  sourceDate: "2022-12-20",
  caseSelection:
    "First two displayed ballots; distinct from original five development ballots. No case substitution.",
  cases,
  editorial,
  editorialSource:
    "https://www.bfi.org.uk/sight-and-sound/polls/50-best-films-2022",
  editorialDate: "2022-12-19",
  seedPositions: [1, 3, 5, 7, 9],
  heldOutPositions: [2, 4, 6, 8, 10],
  scriptSha256: sha256(readFileSync(new URL(import.meta.url), "utf8")),
  rankingSha256: sha256(readFileSync("packages/taste-engine/index.ts", "utf8")),
  maximumAdapterCalls: 14,
  maximumUpstreamAttempts: 28,
  strategies: ["combined-seeds-take12", "combined-seeds-take20"],
  productionTakeUnchanged: 12,
  fixedSimulatedAnswer: answer.label,
  noModelCalls: true,
  protocol:
    "Resolve unique exact-title seeds (ambiguities abstain); sequential same-seed queries at 12 and 20; exclude seed IDs and normalized titles; keep provider order, legacy and conservative rerank. Independently retrieved editorial top12 removes identical seed titles and requires no Qloo calls. Freeze rankings before matching held-out normalized titles. All 10 held-outs remain in denominators; no post-result tuning.",
  limits: [
    "Tiny retrospective expert convenience sample; absence is not dislike; exact title is provisional, no year/director proof.",
    "Editorial baseline uses the same poll's aggregate, including evaluated voters: circularity benefits baseline. It is not an independent generalization comparison.",
    "Editorial baseline is restricted to annual films; Qloo is unrestricted, a domain mismatch. This tests discovery overlap, not ordinary-user relevance.",
    "Answer is simulated, not a statement by either voter; no genuine question-efficiency or correction-recovery measure.",
    "Provider descriptions are inspected in memory only; persist title/ID/year, metadata presence, hint support/order, latency and call counts. No identity or held-out titles sent to Qloo.",
  ],
};
if (!process.argv.includes("--live")) {
  console.log(JSON.stringify({ dryRun: true, protocol }, null, 2));
} else {
  const frozen = freezeProtocol("retrieval-diagnostic", protocol);
  const report: any = {
    protocolFile: basename(frozen.prefix) + ".protocol.json",
    protocolSha256: frozen.protocolSha256,
    startedAt: new Date().toISOString(),
    adapterCalls: 0,
    upstreamAttempts: 0,
    modelCalls: 0,
    cases: [],
  };
  const save = () =>
    writeFileSync(
      frozen.prefix + ".json",
      JSON.stringify(report, null, 2) + "\n",
    );
  save();
  async function call(
    tool: "search" | "insights",
    inputs: Record<string, string>,
  ) {
    const started = performance.now();
    report.adapterCalls++;
    try {
      const e = await callQloo(tool, inputs, "movie");
      report.upstreamAttempts += e.cached ? 0 : e.requestAttempts || 1;
      return { e, ms: Math.round(performance.now() - started) };
    } catch (error) {
      report.failure = {
        code: (error as any).code || "UNKNOWN",
        elapsedMs: Math.round(performance.now() - started),
        upstreamAttempts:
          "Failure may include a bounded retry; successful count excludes this unknown.",
      };
      save();
      throw error;
    }
  }
  for (const c of cases) {
    const seedTitles = c.titles.filter((_, i) => i % 2 === 0);
    const holdouts = c.titles.filter((_, i) => i % 2 === 1).map(normalizeTitle);
    const row: any = { id: c.id, seedResolution: [], strategies: [] };
    report.cases.push(row);
    save();
    const seeds: Entity[] = [];
    for (const title of seedTitles) {
      const { e, ms } = await call("search", { query: title });
      const exact = e.entities.filter(
        (x) => normalizeTitle(x.name) === normalizeTitle(title),
      );
      if (exact.length === 1) seeds.push(exact[0]);
      row.seedResolution.push({
        title,
        ms,
        cached: e.cached,
        status:
          exact.length === 1
            ? "unique-title-only"
            : exact.length
              ? "ambiguous"
              : "not-found",
        candidates: e.entities.map((x) => ({
          id: x.id,
          name: x.name,
          releaseYear: x.releaseYear,
        })),
      });
      save();
    }
    const excluded = new Set(seedTitles.map(normalizeTitle));
    const baseline = editorial
      .filter((t) => !excluded.has(normalizeTitle(t)))
      .map(normalizeTitle);
    row.noQlooEditorial = {
      providerCalls: 0,
      questionCount: 0,
      ranking: baseline,
      metrics: evaluateRetrospective(
        baseline,
        { editorial: baseline },
        holdouts,
      ),
    };
    if (!seeds.length) {
      row.status = "no-resolved-seeds";
      save();
      continue;
    }
    for (const take of ["12", "20"]) {
      const { e, ms } = await call("insights", {
        entities: [...new Set(seeds.map((s) => s.id))].join(","),
        take,
      });
      const pool = e.entities.filter(
        (x) =>
          !excluded.has(normalizeTitle(x.name)) &&
          !seeds.some((s) => s.id === x.id),
      );
      const orders = {
        qloo: pool,
        legacy: legacy(pool),
        conservative: rankByVerifiedMetadata(pool, [answer]),
      };
      const rankings = Object.fromEntries(
        Object.entries(orders).map(([k, v]) => [
          k,
          v.map((x) => normalizeTitle(x.name)),
        ]),
      );
      // Duplicate normalized names are ambiguous and score as absent, never silently pick a remake.
      const counts = new Map<string, number>();
      for (const x of pool) {
        const n = normalizeTitle(x.name);
        counts.set(n, (counts.get(n) || 0) + 1);
      }
      const identity = (x: Entity) =>
        counts.get(normalizeTitle(x.name)) === 1
          ? normalizeTitle(x.name)
          : "ambiguous:" + x.id;
      const scored = Object.fromEntries(
        Object.entries(orders).map(([k, v]) => [k, v.map(identity)]),
      );
      const entry: any = {
        take: Number(take),
        ms,
        cached: e.cached,
        evidenceId: e.id,
        returnedCount: e.entities.length,
        candidateCount: pool.length,
        uniqueTagCount: new Set(pool.flatMap((x) => x.tags)).size,
        descriptions: pool.filter((x) => x.description).length,
        releaseYears: pool.filter((x) => x.releaseYear).length,
        questionCount: { qloo: 0, legacy: 1, conservative: 1 },
        candidates: pool.map((x) => ({
          id: x.id,
          name: x.name,
          releaseYear: x.releaseYear,
          descriptionPresent: Boolean(x.description),
          tagCount: x.tags.length,
        })),
        rankings,
        rankingsFrozenAt: new Date().toISOString(),
      };
      row.strategies.push(entry);
      save();
      entry.metrics = evaluateRetrospective(
        pool.map(identity),
        scored,
        holdouts,
      );
      save();
    }
    row.status = "complete";
    save();
  }
  report.completedAt = new Date().toISOString();
  save();
  console.log(
    JSON.stringify(
      {
        evidence: basename(frozen.prefix) + ".json",
        adapterCalls: report.adapterCalls,
        modelCalls: 0,
        cases: report.cases.map((c: any) => ({
          id: c.id,
          resolved: c.seedResolution.filter(
            (s: any) => s.status === "unique-title-only",
          ).length,
          editorial: c.noQlooEditorial.metrics.metrics.editorial,
          strategies: c.strategies.map((s: any) => ({
            take: s.take,
            ms: s.ms,
            candidates: s.candidateCount,
            recall: s.metrics.retrievalRecall,
            metrics: s.metrics.metrics,
          })),
        })),
      },
      null,
      2,
    ),
  );
}
