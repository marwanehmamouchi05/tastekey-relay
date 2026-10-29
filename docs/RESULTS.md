# Evaluation results — October 28, 2026

October 29 addendum: [pipeline diagnosis and fresh two-list diagnostic](RECOMMENDATION_DIAGNOSIS_2026-10-29.md) record 14 real upstream attempts, zero model calls, a bounded reranker and preserved uncertainty. On new annual lists, retrieval at 12 found 1/10 held-out titles; 20 found 2/10, with no top-three gain. Both Qloo and the revised simulated-answer arm have mean Hit@3 0.5; their rankings are identical. An independent-retrieval editorial baseline has Hit@3 0.5 and recall 3/10, but contains the evaluated voters in its aggregate and has a narrower annual domain. This remains a tiny, biased retrospective proxy, not a human study or superiority evidence. The original negative experiment below is unchanged.

**This experiment does not establish a recommendation-quality advantage.** Five retrospective public film ballots produced one provisional held-out match across 25 held-out films. The fixed simulated verification answer made that match rank worse. All cases, including misses, are retained.

## Public-list proxy, not human testers

At the owner's request, agents researched public profiles rather than recruiting people. Primary BFI 2022 Sight and Sound ballots supplied ten films each for [Bong Joon-ho](https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time/all-voters/bong-joon-ho), [Joanna Hogg](https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time/all-voters/joanna-hogg), [Barry Jenkins](https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time/all-voters/barry-jenkins), [Sofia Coppola](https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time/all-voters/sofia-coppola) and [Guillermo del Toro](https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time/all-voters/guillermo-del-toro). The [poll announcement](https://www.bfi.org.uk/news/revealed-results-2022-sight-sound-greatest-films-all-time-poll) is dated December 1, 2022; individual ballot publication dates were not displayed.

These public cultural facts do not imply participation, consent to a user study, endorsement, private knowledge or representative consumer preferences. Ballot membership is a weak positive label; absence is unknown, not dislike. Potential provider/training-data contamination remains. No agent-generated relevance ratings are counted as human evidence.

Before API calls, the dataset, split, script and engine hashes were frozen. Odd source positions supplied five seed titles; even positions supplied five held-out positives. Only seed titles/entity IDs entered Qloo, with no person's name, ballot URL or held-out title. Unique exact-title matches were used provisionally; ambiguous matches were omitted and recorded. Year/director identity was not verified against provider results.

Each real Qloo request returned 12 candidates. Identical pools were ordered alphabetically, by returned Qloo order, and by the production metadata reranker using the same fixed simulated answer, “Emotional storytelling”. That answer is a scenario assumption, not a statement by any filmmaker. Pools and rankings were saved before label matching. Out-of-pool positives count as misses; no case was dropped.

| Public ballot      | Resolved seed titles / 5 | Held-out titles in pool / 5 | Qloo Hit@3 | Simulated verification Hit@3 |
| ------------------ | -----------------------: | --------------------------: | ---------: | ---------------------------: |
| Bong Joon-ho       |                        4 |                           0 |          0 |                            0 |
| Joanna Hogg        |                        4 |                           0 |          0 |                            0 |
| Barry Jenkins      |                        4 |                           0 |          0 |                            0 |
| Sofia Coppola      |                        4 |                           0 |          0 |                            0 |
| Guillermo del Toro |                        2 |                           1 |          1 |                            0 |

| Same-pool ordering           | Mean Hit@3 | Mean reciprocal rank | Mean binary nDCG@3 |
| ---------------------------- | ---------: | -------------------: | -----------------: |
| Alphabetical                 |     0.2000 |               0.2000 |             0.0939 |
| Qloo returned order          |     0.2000 |               0.0667 |             0.0469 |
| Fixed simulated verification |     0.0000 |               0.0222 |             0.0000 |

Title-linked retrieval recall was **1/25 (4%)**. In the one matched case, the title ranked 1 alphabetically, 3 in Qloo order and 9 after the simulated answer. Alphabetical order shares Qloo's pool; this is not a comparison with an independent popularity or LLM retrieval system. Five expert ballots, one weak title match and provisional seed identity cannot support significance, ordinary-user accuracy or superiority claims. Graded nDCG, genuine question efficiency and real-user correction recovery are not measured.

## Studio mechanical ablation

Three fixed synthetic business cases compared the input-only planning rule with the real Qloo-assisted deterministic planner. Both arms received identical briefs, seeds, city and budget. No AI wording or human ratings were used in this experiment.

| Synthetic case |    Budget | Baseline allocated | Qloo-assisted allocated | Grounded proposals / proposals | Dangling evidence links |
| -------------- | --------: | -----------------: | ----------------------: | -----------------------------: | ----------------------: |
| Cinema         | 1,000 EUR |                200 |                     416 |                            4/4 |                       0 |
| Bookshop       | 3,000 MAD |                600 |                   1,250 |                            4/4 |                       0 |
| Retailer       |     0 USD |                  0 |                       0 |                            4/4 |                       0 |

All three investigations returned live cultural evidence, all allocations were finite/nonnegative and within their respective budgets, and all 12 assisted proposals linked to returned entities/evidence and supplied dependencies and a next action. The baseline has one proposal and zero cultural evidence by design. Counts and grounding do not establish that four proposals are better than one, feasible in the real world, useful to an owner or likely to increase revenue.

## Reproduce and inspect

- [Fixed public dataset](../data/evaluation/public-profiles.json).
- [Public-profile frozen protocol](../data/evaluation/results-public-profiles-2026-10-28T17-24-08-505Z.protocol.json) and [results](../data/evaluation/results-public-profiles-2026-10-28T17-24-08-505Z.json).
- [Studio frozen protocol](../data/evaluation/results-studio-2026-10-28T17-25-51-828Z.protocol.json) and [results](../data/evaluation/results-studio-2026-10-28T17-25-51-828Z.json).
- `node --import tsx scripts/evaluate-public-profiles.ts` and `node --import tsx scripts/evaluate-studio.ts` preview the protocols without API calls. Add `--live` to execute at most 30 and 4 sequential adapter calls respectively, with production-bounded retry behavior. Provider data may change.
- Metric tests: `npx pnpm@10.20.0 exec vitest run tests/evaluation/metric.test.ts`.

Provider descriptions and private credentials are not published. Only workstation paths were removed from result headers; the frozen protocol bytes and hashes remain unchanged. New live runs create new files and do not overwrite this evidence. Local correctness tests and a five-session baseline concurrency check are functional evidence, not a controlled production capacity benchmark.
