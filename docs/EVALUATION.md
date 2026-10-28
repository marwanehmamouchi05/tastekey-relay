# Evaluation protocol

No user-study result, live API result, conversion lift, ranking improvement or business outcome has been manufactured.

## October 28 retrospective public-profile experiment

[RESULTS.md](RESULTS.md) records the first frozen public-list proxy and three synthetic Studio ablations. This is not an independent human study. Five public BFI ballots use odd source positions as seeds and even positions as held-outs; only seed identities enter real Qloo requests. Conservative title-only resolution is explicitly provisional. All five cases and all 25 positives remain in denominators, including misses. Ranking uses the production helper and a predeclared simulated answer, not invented human preferences. The results do not establish improvement; the sole matched title ranked worse after the fixed simulated answer.

The original self-report protocol below remains available for genuine future participants. Privacy's comparison now invokes the same production reranker as Suggestions and only the currently authorized likes for the saved pool's context. Legacy pools without context require a fresh suggestion request. This fixes an earlier duplicated calculation that could include unrelated/unshared preferences.

## Personal

1. Obtain a real Qloo candidate pool using a user's authorized, reviewed references.
2. Ask for a held-out preferred item before revealing experiment rankings.
3. Compare three permutations of exactly that pool: alphabetical baseline, Qloo order, and Qloo order reranked by confirmed preference keywords found in returned names, descriptions and tags.
4. Calculate Hit@3 and rank of the first relevant choice. Preserve pool ID, selections, rankings, timestamp and answered-question count in browser storage; export JSON from Proof.

The baseline is **alphabetical**, not popularity; no popularity dataset is claimed. Adaptive reranking is deliberately simple and can produce ties. The current flow is not blinded and users may have already seen their Relay recommendations, so label these observations as exploratory self-reports. Each experiment represents one reported choice. Multiple choices from one person are not independent participants. The question count is not a controlled estimate of question efficiency. Do not claim superiority until independent, held-out multi-participant data supports it.

## Studio

Run Qloo-assisted and no-Qloo investigations on the same saved input. Export the workspace to retain both input snapshots and traces. The no-Qloo baseline is a business-input pilot planning rule. There is no fabricated automatic quality score.

Use human reviewers, blind source labels where possible, and the following fixed 1–5 rubric:

| Dimension          | 1                          | 3                            | 5                                                            |
| ------------------ | -------------------------- | ---------------------------- | ------------------------------------------------------------ |
| Relevance          | Unrelated to objective     | Partially relevant           | Directly addresses the stated objective                      |
| Feasibility        | Violates constraints       | Some dependencies unresolved | Fits budget and capacity with verified dependencies          |
| Specificity        | Generic suggestion         | Named pilot                  | Concrete offering, owner, timing, metric                     |
| Cultural grounding | Unsupported cultural claim | Evidence present, link weak  | Traceable cultural result linked to a bounded interpretation |
| Traceability       | Source absent              | Partial provenance           | Inputs, evidence, limits and decisions reproducible          |

Store reviewer identity pseudonymously, timestamp, exact analysis IDs, dimension scores and free-text rationale. Report sample size and disagreements. Qloo scores must not grade their own business usefulness. The Human evaluation view provides a persisted rubric editor linked to exact analysis IDs. Reviewer aliases are self-reported; this is not blinded or proof of independent participation. Export the workspace to retain reviews and input snapshots.

## Current evidence

- Unit and integration tests use clearly synthetic fixtures and verify correctness, not recommendation quality.
- Browser tests exercise saved business -> baseline proposal -> accepted action -> reported outcome -> later lesson.
- Live Qloo integration and actual Bedrock correction/strategy checks have passed; see docs/live-evidence. These establish integration correctness, not user-study quality.
- Owner outcomes entered through the app are reported observations, not independently audited results or causal evidence.
