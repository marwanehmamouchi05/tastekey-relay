# Recommendation diagnosis — October 29, 2026

## Findings and decisions

The original five-ballot experiment remains unchanged. Its single retrieved positive (1/25) cannot diagnose global user accuracy, but it exposed an unsafe ranking prior. The old code sorted every candidate by substring-hit count and used Qloo order only for ties. A long description, a coincidental title or a partial word could therefore outweigh the entire provider order. The fixed simulated answer was not a filmmaker's answer and its relevance was never established. Reranking cannot recover a title absent from retrieval.

The revised rule is deliberately conservative, not a learned recommender: only user-confirmed non-entity interpretations count; all informative words must occur as whole words in one description/tag field; nearby negation abstains; names do not supply preference evidence. A binary hint subtracts 1.1 from the original zero-based rank, so promotion/demotion is bounded to one place. Duplicated confirmations do not amplify it. This bound is an engineering safety choice tested on synthetic cases, not a fitted accuracy estimate. English negation detection is limited; metadata matches are not semantic entailment or probabilities.

A final regression guard also abstains on negative manual answer wording such as “not,” “avoid” and “don't.” It does not invent inverse Qloo affinities or a validated negative-preference model. This guard was added after the fresh proxy measurement; that experiment used only the fixed positive phrase, so it supplies no new evidence about negative-answer quality. The exact engine used for the measurement remains preserved.

Choosing one reason previously marked all unchosen reasons rejected. They now remain uncertain. A parent already answered is not asked again; rejected/missing parents are not questioned, expired grants do not raise question priority, and an invalid selected node leaves the profile unchanged. “None of these” still explicitly rejects the proposed reasons. Skipping the optional question changes no preference state. We do not label this information-gain optimization: priority remains a transparent unresolved-context heuristic, without a validated model of question utility.

## Pipeline inspection

| Stage               | Finding / action                                                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input               | Reviewed search results require a user choice. Local unsearched likes are not converted into invented Qloo IDs. Guided multiple-choice examples remain optional.                                                                                                                                  |
| Resolution          | The original run resolved 18/25 titles. The new lists resolve only 5/10 seed titles because exact-name remakes/duplicates are ambiguous. Preserve returned release year and display it in Personal and Studio search choices; do not auto-select a remake. Search still requests five candidates. |
| Query               | Personal sends selected, authorized entity IDs and a target category; no person identity, graph, budget or held-out film. No geographic/popularity filter is applied there. Studio's city is a signal, not a hard radius filter or demand proof.                                                  |
| Cross-category      | Entertainment, shopping and travel have distinct allowlists; arbitrary design text without a reviewed Qloo entity is not sent as a fabricated entity seed. Changing category changes the destination type, not private spending assumptions.                                                      |
| Retrieval           | Production requests 12. The adapter previously truncated every response at 20, so simply requesting more than 20 would have been ineffective. A controlled diagnostic supports 20 without changing the production default. No scores from separate requests are compared.                         |
| Candidate filtering | Adapter deduplicates stable provider IDs. Suggestions omit exact seed IDs and duplicates before saving the common Proof pool, preserve remaining order and show an honest empty state. Same-title distinct IDs are not automatically merged.                                                      |
| Ranking             | The old global substring sort could overwhelm Qloo order. The new complete-word, confirmed-only hint makes a bounded local move and otherwise abstains. Affinity remains aggregate, not individual probability.                                                                                   |
| Verification        | Unchosen reasons remain uncertain; explicit “none” rejects. No invented confidence increase or question-efficiency claim.                                                                                                                                                                         |
| Correction          | Budget corrections retain unrelated interests; optional model output is reviewed, structurally validated and cannot change protected IDs/costs/ownership. Genuine user quality-recovery data is unavailable.                                                                                      |
| Explanation         | UI describes the local one-place rule and exclusions in simple English. Source evidence, live/cache labels and original relative order remain inspectable. No synthetic shopping/quote is presented as live inventory.                                                                            |
| Provider operations | Identical in-flight calls share a promise; failures clear it so a later request can recover. Five-minute cache, maximum two concurrent operations, 25-second transport timeout and one limited transient retry remain.                                                                            |

## Development before/after checks

These are synthetic correctness tests, not human relevance labels.

| Case                                                                | Previous behavior               | Revised behavior      |
| ------------------------------------------------------------------- | ------------------------------- | --------------------- |
| A title says “Emotional storytelling”; metadata supplies no support | Promoted on title               | Unchanged             |
| “Unemotional storytelling”                                          | Substring matches “emotional”   | Unchanged             |
| “Emotional spectacle” for the answer “Emotional storytelling”       | One token promotes              | Unchanged             |
| “Not emotional storytelling”                                        | Negated phrase promotes         | Unchanged             |
| An exact supported answer appears far down a 12-item pool           | Can move across the entire list | At most one place     |
| Adjacent item has full confirmed metadata support                   | Promotes                        | Promotes one place    |
| Choose one of three nonexclusive reasons                            | Two false rejections            | Two uncertain reasons |
| Unknown option ID                                                   | Rejects all inferred reasons    | No state change       |

`tests/ranking-guardrails.test.ts`, `tests/engine.test.ts`, `tests/adapter.test.ts` and `tests/adapter-concurrency.test.ts` cover these contracts. The browser Proof test uses actual metadata support and the same production helper.

The executed six-case development measurement is saved in `data/evaluation/ranking-guards-2026-10-29.json` and reproduced by `scripts/evaluate-ranking-guards.ts`. Four unsupported fixture promotions fell from one position to zero. The last item in a twelve-item pool moved eleven positions under the legacy sort and one under the revised rule. An adjacent full supported hint still moved one position. All measurements used zero provider/model calls; these are guardrail outcomes, not human relevance gains.

## Fresh diagnostic, frozen before provider calls

Two previously unused annual lists are the first two displayed ballots in BFI's [December 20, 2022 annual-vote page](https://www.bfi.org.uk/sight-and-sound/polls/best-films-2022-all-votes): Jason Anderson and Michael Atkinson. This differs from the original five all-time ballots. Odd positions seed; even positions are held-out positives. No person participated, supplied the simulated answer or endorsed TasteKey. Unlisted films remain unknown. Exact normalized titles remain provisional identities; director/year verification was not retroactively invented.

The independent-retrieval no-Qloo arm is the top 12 of BFI's [December 19 annual aggregate](https://www.bfi.org.uk/sight-and-sound/polls/50-best-films-2022), excluding given seeds. It is a meaningful editorial discovery baseline but contains these voters' contributions and is restricted to annual films, while Qloo is unrestricted. That circularity and domain advantage prevent a fair generalization/superiority claim. All arms receive the same initial titles; only simulated verification arms get the one fixed scenario answer. Genuine question efficiency is not measured.

The frozen protocol records source/script/ranker hashes and all 10 held-outs before 14 sequential adapter calls. Rankings are saved before matching labels. There were 14 successful upstream attempts, zero retries, zero model calls, in 56.229 seconds including startup and file writes. Ten searches took 2.363–18.476 seconds each (one cold startup dominates); four recommendation calls took 3.618–3.905 seconds. Timings include the CLI process and are not pure API server latency or a controlled performance benchmark.

| Case     | Resolved / 5 | 12 returned / after exclusions | Recall at 12 | 20 returned / after exclusions | Recall at 20 | Qloo / new reranker Hit@3 at both sizes |
| -------- | -----------: | -----------------------------: | -----------: | -----------------------------: | -----------: | --------------------------------------: |
| Anderson |            3 |                        12 / 12 |          0/5 |                        20 / 20 |          0/5 |                                   0 / 0 |
| Atkinson |            2 |                        12 / 11 |          1/5 |                        20 / 19 |          2/5 |                                   1 / 1 |

Overall recall rises from 1/10 to 2/10 when requesting 20; top-three metrics do not improve. Qloo, legacy and revised ranking are identical on these fresh pools: the simulated phrase has no eligible local effect. Mean Hit@3 is 0.5, MRR 0.1667 and binary nDCG@3 0.1173 at both sizes. The editorial arm also has Hit@3 0.5, MRR 0.5833 and binary nDCG@3 0.2346, with 3/10 retrieved positives. These small, biased overlaps support no superiority claim. No genuine correction feedback was collected.

Metadata tag unions increased from 221 to 342 and 198 to 326 at 20 candidates, but cardinality mechanically grows with pool size and is not measured semantic diversity. Two searches were dropped as ambiguous in Anderson, three in Atkinson. Missing or wrong seed coverage remains a major confounder. Production stays at 12: one extra retrospective title and no top-three gain do not justify automatic multi-query expansion or extra quota use.

Reproduction: `node --import tsx scripts/evaluate-retrieval.ts` previews without calls; `--live` freezes new files before at most 14 adapter calls (up to 28 upstream attempts if transient retries occur). See `data/evaluation/results-retrieval-diagnostic-2026-10-29T00-28-56-554Z.*`. `retrieval-ranking-frozen.ts.txt` preserves the exact hashed engine used; later addition of the seed-exclusion helper does not change that measured ranking function. Do not rerun and cherry-pick a better result. The [voluntary workflow](VOLUNTARY_EVALUATION.md) prepares genuine future answers without claiming they already exist.
