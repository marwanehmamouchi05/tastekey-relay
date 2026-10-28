import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { callQloo, configured } from "../packages/qloo-adapter/index";
import { evaluateRetrospective } from "../packages/evaluation/index";
import { rankByVerifiedMetadata } from "../packages/taste-engine/index";
import type { Entity, Preference } from "../packages/shared-types/index";

export type PublicFilm = {
  title: string;
  sourceYear: number;
  director: string;
  aliases: string[];
};
type PublicProfile = {
  id: string;
  name: string;
  sourceUrl: string;
  films: PublicFilm[];
};
const root = fileURLToPath(new URL("../", import.meta.url));
export const datasetPath = resolve(
  root,
  "data/evaluation/public-profiles.json",
);
export const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function filmAliases(film: PublicFilm) {
  return new Set([film.title, ...film.aliases].map(normalizeTitle));
}
/** At most one exact title match among the returned search candidates; never first-result selection. */
export async function resolveExactSeed(film: PublicFilm) {
  const query = film.aliases[0] || film.title;
  const evidence = await callQloo("search", { query }, "movie");
  const aliases = filmAliases(film);
  const matches = [
    ...new Map(
      evidence.entities
        .filter(
          (e) => e.category === "movie" && aliases.has(normalizeTitle(e.name)),
        )
        .map((e) => [e.id, e]),
    ).values(),
  ];
  return {
    entity: matches.length === 1 ? matches[0] : undefined,
    audit: {
      query,
      status:
        matches.length === 1
          ? "unique-title-only"
          : matches.length
            ? "ambiguous"
            : "not-found",
      yearAndDirectorVerified: false,
      searchEvidenceId: evidence.id,
      at: evidence.at,
      candidates: evidence.entities.map(({ id, name, category }) => ({
        id,
        name,
        category,
      })),
    },
  };
}

export function freezeProtocol(kind: string, protocol: unknown) {
  const directory = resolve(root, "data/evaluation");
  mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = resolve(directory, `results-${kind}-${stamp}`);
  const text = `${JSON.stringify(protocol, null, 2)}\n`;
  writeFileSync(`${prefix}.protocol.json`, text, { flag: "wx" });
  return { prefix, protocolSha256: sha256(text) };
}

const simulatedAnswer = "Emotional storytelling";
const simulatedPreference: Preference = {
  id: "synthetic-fixed-answer",
  label: simulatedAnswer,
  category: "movie",
  status: "confirmed",
  evidence: [
    {
      id: "synthetic",
      source: "rule",
      detail: "Fixed simulated answer, not a real person's answer.",
      at: "2026-10-28T00:00:00.000Z",
    },
  ],
  updatedAt: "2026-10-28T00:00:00.000Z",
};

async function main() {
  const datasetText = readFileSync(datasetPath, "utf8");
  const dataset = JSON.parse(datasetText) as { profiles: PublicProfile[] };
  if (
    dataset.profiles.length !== 5 ||
    dataset.profiles.some((p) => p.films.length !== 10)
  )
    throw new Error(
      "Protocol requires exactly five fixed ten-film source lists.",
    );
  const protocol = {
    kind: "retrospective-public-ballot-positive-list",
    createdAt: new Date().toISOString(),
    datasetSha256: sha256(datasetText),
    dataset,
    sourceScriptSha256: sha256(
      readFileSync(fileURLToPath(import.meta.url), "utf8"),
    ),
    rankingEngineSha256: sha256(
      readFileSync(resolve(root, "packages/taste-engine/index.ts"), "utf8"),
    ),
    metricEngineSha256: sha256(
      readFileSync(resolve(root, "packages/evaluation/index.ts"), "utf8"),
    ),
    nodeVersion: process.version,
    seedPositions: [1, 3, 5, 7, 9],
    heldOutPositions: [2, 4, 6, 8, 10],
    maximumAdapterCalls: 30,
    providerRetries:
      "Production adapter may retry transient 5xx once; maximum 60 upstream attempts, usually <=30.",
    sequential: true,
    arms: [
      "alphabetical-en-title-id",
      "qloo-returned-order",
      "qloo-plus-simulated-verification",
    ],
    fixedSimulatedAnswer: simulatedAnswer,
    simulatedAnswerMeaning:
      "Identical predeclared rule input for every case, not that public person's reported preference.",
    matching:
      "Exact normalized title aliases only; year/director NOT verified. Ambiguous returned title matches excluded, with coverage recorded. No held-out search calls.",
    leakageControl:
      "Only seed titles enter search. Only resolved seed entity IDs enter recommendations. No source URL, person identity, held-out title or model call enters retrieval/reranking.",
    metrics:
      "Hit@3, recall@3, reciprocal rank and binary nDCG@3 over all five held-outs; out-of-pool or ambiguous linkage is zero. Conditional pool-only metrics are secondary.",
    limitations: [
      "Not human participants, independent validation, blind preference elicitation, causal evidence or proof of quality.",
      "Alphabetical arm shares Qloo's retrieval pool; this primarily tests conditional ranking, not independent retrieval superiority.",
      "Published ballots may contaminate provider data. Unlisted films are unknown, not negative labels.",
      "Title-only linkage can confuse remakes despite unique returned names. Report provisional title linkage, not canonical identity proof.",
      "Keyword feature matches and rankings are retained; copyrighted provider descriptions are not stored.",
      "Failures and zero-hit cases remain in the report; no tuning, substitutions or retries to improve scores.",
    ],
  };
  if (!process.argv.includes("--live")) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          protocol,
          instruction:
            "Add --live to opt into at most 30 sequential production adapter calls. No API was called.",
        },
        null,
        2,
      ),
    );
    return;
  }
  // Freeze before configuration checks or the first provider operation.
  const frozen = freezeProtocol("public-profiles", protocol);
  const rows: any[] = [];
  const output = {
    protocolFile: `${frozen.prefix}.protocol.json`,
    protocolSha256: frozen.protocolSha256,
    startedAt: new Date().toISOString(),
    completedAt: null as string | null,
    intendedCaseCount: dataset.profiles.length,
    cases: rows,
  };
  const save = () =>
    writeFileSync(
      `${frozen.prefix}.json`,
      `${JSON.stringify(output, null, 2)}\n`,
    );
  save();
  if (!(await configured()))
    throw new Error(
      "Qloo is not configured. Frozen protocol retained; no benchmark calls made.",
    );
  for (const profile of dataset.profiles) {
    const row: any = {
      id: profile.id,
      sourceUrl: profile.sourceUrl,
      status: "started",
      seedResolution: [],
    };
    rows.push(row);
    save();
    try {
      const seedFilms = profile.films.filter((_, i) => i % 2 === 0);
      const heldOutFilms = profile.films.filter((_, i) => i % 2 === 1);
      const seeds: Entity[] = [];
      for (const film of seedFilms) {
        const resolved = await resolveExactSeed(film);
        row.seedResolution.push({ film, ...resolved.audit });
        if (resolved.entity && !seeds.some((e) => e.id === resolved.entity!.id))
          seeds.push(resolved.entity);
        save();
      }
      row.resolvedSeedCount = seeds.length;
      if (!seeds.length) {
        row.status = "no-unique-title-seeds";
        save();
        continue;
      }
      const inputs = { entities: seeds.map((e) => e.id).join(",") };
      const evidence = await callQloo("insights", inputs, "movie");
      const seen = new Set<string>();
      const seedAliases = new Set(
        seedFilms.flatMap((film) => [...filmAliases(film)]),
      );
      const seedIds = new Set(seeds.map((e) => e.id));
      let duplicateCount = 0,
        excludedSeedCount = 0;
      const pool = evidence.entities.filter((entity) => {
        if (seen.has(entity.id)) {
          duplicateCount++;
          return false;
        }
        seen.add(entity.id);
        if (
          seedIds.has(entity.id) ||
          seedAliases.has(normalizeTitle(entity.name))
        ) {
          excludedSeedCount++;
          return false;
        }
        return true;
      });
      // Pool is finalized before held-out matching. No held-out data changes retrieval or ranking.
      const qloo = pool.map((e) => e.id);
      const alphabetical = [...pool]
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, "en") ||
            a.id.localeCompare(b.id, "en"),
        )
        .map((e) => e.id);
      const adaptive = rankByVerifiedMetadata(pool, [simulatedPreference]).map(
        (e) => e.id,
      );
      const rankings = { alphabetical, qloo, simulatedVerification: adaptive };
      row.frozenPoolBeforeLabelMatching = {
        at: new Date().toISOString(),
        evidenceId: evidence.id,
        inputs,
        candidateIds: qloo,
        rankings,
        sha256: sha256(
          JSON.stringify({
            candidates: pool.map(({ id, name }) => ({ id, name })),
            rankings,
          }),
        ),
      };
      save();
      const linkage = heldOutFilms.map((film, i) => {
        const aliases = filmAliases(film);
        const matches = pool.filter((e) => aliases.has(normalizeTitle(e.name)));
        return {
          film,
          status:
            matches.length === 1
              ? "unique-title-only"
              : matches.length
                ? "ambiguous"
                : "not-in-pool",
          matchedIds: matches.map((e) => e.id),
          metricPositiveId:
            matches.length === 1
              ? matches[0].id
              : `unretrieved:${profile.id}:${i}`,
        };
      });
      const positiveIds = linkage.map((item) => item.metricPositiveId);
      if (new Set(positiveIds).size !== positiveIds.length)
        throw new Error(
          "Multiple held-out films linked to the same entity; manual identity review required.",
        );
      const conditionalIds = linkage
        .filter((item) => item.status === "unique-title-only")
        .map((item) => item.metricPositiveId);
      const keywords = [
        ...new Set(
          simulatedAnswer
            .toLowerCase()
            .split(/\W+/)
            .filter((word) => word.length > 4),
        ),
      ];
      Object.assign(row, {
        status: "complete",
        retrieval: {
          evidenceId: evidence.id,
          at: evidence.at,
          cached: evidence.cached,
          inputs,
          returnedCount: evidence.entities.length,
          duplicateCount,
          excludedSeedCount,
        },
        candidates: pool.map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          affinity: e.affinity,
          descriptionPresent: Boolean(e.description),
          tagCount: e.tags.length,
          matchedSimulatedKeywords: keywords.filter((word) =>
            `${e.name} ${e.description || ""} ${e.tags.join(" ")}`
              .toLowerCase()
              .includes(word),
          ),
        })),
        heldOutLinkage: linkage,
        rankings,
        metrics: evaluateRetrospective(qloo, rankings, positiveIds),
        conditionalMetrics: conditionalIds.length
          ? evaluateRetrospective(qloo, rankings, conditionalIds)
          : null,
        changedPositions: adaptive.filter((id, i) => id !== qloo[i]).length,
        linkageWarning:
          "Provisional title-only matching; source year/director preserved but not verified against Qloo identity.",
      });
    } catch (error) {
      row.status = "unavailable";
      row.error =
        error instanceof Error ? error.message : "Benchmark operation failed.";
    }
    save();
  }
  output.completedAt = new Date().toISOString();
  save();
  console.table(
    rows.map((row) => ({
      case: row.id,
      status: row.status,
      seeds: row.resolvedSeedCount ?? 0,
      candidates: row.metrics?.candidateCount ?? null,
      heldOutInPool: row.metrics?.retrievedPositiveCount ?? null,
      qlooHit3: row.metrics?.metrics.qloo.hitAtK ?? null,
      simulatedHit3: row.metrics?.metrics.simulatedVerification.hitAtK ?? null,
      changedPositions: row.changedPositions ?? null,
    })),
  );
  console.log(`Evidence: ${frozen.prefix}.json`);
  console.log(
    "Descriptive public-list proxy only. No human ratings or confirmed public-person preferences were generated.",
  );
  if (rows.some((row) => row.status !== "complete")) process.exitCode = 1;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Evaluation failed.",
    );
    process.exitCode = 1;
  });
