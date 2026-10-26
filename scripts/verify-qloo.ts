import { callQloo, configured } from "../packages/qloo-adapter/index";
import { writeFileSync, mkdirSync } from "node:fs";
import type { QlooEvidence } from "../packages/shared-types/index";
const publicEvidence = (e: QlooEvidence) => ({
  ...e,
  entities: e.entities.map(({ description, ...entity }) => entity),
});
async function main() {
  if (!(await configured()))
    throw new Error(
      "Event credential is not configured. Run pnpm qloo -- setup --qloo in a trusted terminal.",
    );
  const search = await callQloo("search", { query: "Interstellar" }, "movie");
  console.log(
    "Search candidates (review exact reference):",
    search.entities.map((e) => ({ id: e.id, name: e.name })),
  );
  const chosen = search.entities.filter(
    (e) => e.name.toLowerCase() === "interstellar",
  );
  if (chosen.length !== 1)
    throw new Error(
      "Ambiguous or missing exact reference. Review candidates before querying Insights.",
    );
  const movie = await callQloo("insights", { entities: chosen[0].id }, "movie");
  const cross = await callQloo("insights", { entities: chosen[0].id }, "book");
  const city = await callQloo(
    "insights",
    { entities: chosen[0].id, city: "Casablanca" },
    "movie",
  );
  mkdirSync("docs/live-evidence", { recursive: true });
  writeFileSync(
    "docs/live-evidence/qloo-verification.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        search: publicEvidence(search),
        movie: publicEvidence(movie),
        cross: publicEvidence(cross),
        city: publicEvidence(city),
        limitation:
          "Actual public cultural results; no personal data. Affinity is not a probability.",
      },
      null,
      2,
    ),
  );
  console.log(
    "Verified search, movie recommendations, book cross-category and location signals. Evidence saved to docs/live-evidence/qloo-verification.json",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
