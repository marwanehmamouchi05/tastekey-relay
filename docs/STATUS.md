# Acceptance and handoff status

Updated October 27, 2026. Implemented behavior and actual integration evidence are recorded separately from user-study claims.

## Verified delivery

- Public HTTPS: [Personal](https://tastekey.52.47.205.18.sslip.io/personal/discover), [Studio](https://tastekey.52.47.205.18.sslip.io/studio/onboarding).
- Runtime completion revision `9143f3a7ad28daf929d8d8303c1f1f65ce25007d`: all **11 public browser/API tests passed in 2.4 minutes**, including real Qloo and real Bedrock. Screenshots: `docs/screenshots/completion/`.
- Subsequent advisor refinement `7d20be94e1bdbbce3bed766bec6229dadc7dae60`: 46 unit/integration tests pass; one separate credential-gated Qloo unit test deliberately skipped. TypeScript passes. Real local Bedrock/Qloo check passes. Production rebuild and the focused live browser check passed; see the final checkpoint below.
- The prior 45-test completion suite, production build and local nine-browser-test run also passed, with two live cases explicitly skipped locally. Both live browser cases then passed against the public server.
- GitHub CI passed for `9f21103`, `9143f3a` and `85c19f3`. Latest CI is checked separately below.
- Daily consistent SQLite backup service: success, integrity `ok`; timer active for 03:15 UTC plus jitter. A private off-host copy was transferred and independently integrity checked on October 27. The backup installer handles a fresh database whose additive tables have not yet initialized.
- Earlier full server reboot preserved private Studio records and the named data volume. Latest checks confirm non-root runtime, valid TLS, private environment configuration and both providers ready.

## Capability acceptance

| Area                   | Implemented and verified                                                                                                                       | Remaining limit                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Personal taste         | Explicit onboarding, adaptive template hypotheses, impact-based selection, editable graph/list, rejection and persistence                      | Adaptive-question usefulness not measured                                                           |
| Corrections            | Separate budget editor; optional real Nova Micro interpretation, reviewed application; $60 hotel limit preserves existing film/design tastes   | Explicit USD only; arbitrary prose is not guaranteed semantic truth                                 |
| Permissions            | Selected fields, contexts, 24-hour expiry, revocation and pending-response guard                                                               | Local browser storage and shared-device exposure                                                    |
| Experiences            | Real Qloo movie/TV, brand and destination inspiration                                                                                          | Shopping catalog/prices are samples; no booking inventory                                           |
| Practical travel       | Local dated, user-checked quote filtering by returned destination, 48-hour freshness, future stay and budget                                   | User source is not independently verified; no invented quote or FX                                  |
| Studio records         | Private SQLite business profiles, proposals, plans, outcomes and anchored human reviews                                                        | Capability sessions, not team SSO or verified reviewer identities                                   |
| Cultural investigation | Reviewed entity IDs, city signal, official harness, bounded calls, traces and real evidence                                                    | Organizer quota/expiry unknown; affinity is not demand                                              |
| Categories             | Actual bookshop/book, cafe/place, retail/brand and travel/destination checks, plus cinema/movie browser flow                                   | Synthetic briefs, no actual customers or outcomes                                                   |
| AI advisor             | Real Bedrock, protected costs/evidence/ownership, bounded inputs/tokens, persisted 40/day allowance                                            | Optional; invalid proposals retain deterministic baseline; interpretations require owner validation |
| Scenarios              | Exact snapshots, new city Qloo request, changed budget allocations                                                                             | Allocations are planning bounds, not supplier quotes or forecasts                                   |
| Learning               | Rejections and owner-reported outcomes inform later investigations; accepted proposals become editable actions                                 | Reports are not independently audited causal evidence                                               |
| Consented audience     | Explicit category selection, named-business preview, 30-day expiry, stable-session deduplication, suppression and immediate withdrawal         | Sessions are not verified independent people; no differential privacy or real customer dataset      |
| Recovery               | Hashed/rotated 90-day one-use code; stable workspace mapping and old-session invalidation                                                      | Code grants full access; Personal local graph is not synced                                         |
| Security               | Tenant/relationship authorization, Origin validation, body bounds, nonce script CSP, explicit secrets, expiry, throttling and backup integrity | No independent penetration/privacy audit; one-replica SQLite                                        |
| Evaluation             | Common-pool exploratory observations and persisted five-dimension Studio rubric                                                                | Independent controlled human evaluation remains uncollected                                         |
| Submission             | Saved Devpost draft, story, public/source links, technology tags, labeled screenshots and cover                                                | Inception date confirmed; owner review of rules, eligibility and final submission remains           |

## Actual evidence

`docs/live-evidence/qloo-verification.json` records actual entity resolution, movie/book/location affinities and explainability. `studio-category-verification.json` records the four additional industry categories. `bedrock-verification.json` records real correction and advisor integration with synthetic business inputs and genuine cultural evidence. These establish integration correctness, not recommendation quality, demand or revenue lift.

The public browser suite verifies consent/revocation, recovery/reuse denial, category-only payloads/withdrawal, cross-tenant isolation, CSP, graph, manual-quote filtering, real Qloo contexts and city/budget scenarios, actual AI, saved plans/outcomes, failure states and mobile layout. The quote screenshot is a clearly synthetic fixture with example.org sources; it is not a hotel offer.

## Deployment findings

The first completion image failed because source package files were root-owned mode 600. Health checks restored the previous working app; source COPY ownership now belongs to the non-root app user. The next version passed all 11 public checks. The first backup cleanup ran before new tables existed; a table-existence guard fixed it and the service then completed with a valid snapshot.

Screenshot review found that the initial AI request could echo the baseline. The refinement supplies assigned cultural references and short output slots, avoids sending baseline prose, validates slot coverage, preserves immutable IDs/costs/evidence, labels accepted text as an AI interpretation, and retains baseline text when a proposal omits its assigned reference. Live refinement evidence is saved separately from assertions of quality.

## Work requiring people or external services

- Owner must review Devpost details, including the confirmed project details, eligibility and legal terms, and perform the final submission.
- Independent human reviews and held-out participant comparisons are required before making quality claims. No results have been invented.
- A genuine booking/pricing provider, business identity/team authentication and independent audience verification are future integrations.
- Keep AWS credits, transfer/storage, event quota and credential expiry monitored. The scoped Bedrock identity expires **2026-11-26T09:04:15Z**; rotate or revoke deliberately. No recurring monitor was requested.

## Final verified checkpoint — October 27

Runtime image: `tastekey-relay:7d20be94e1bd`, full reviewed revision `7d20be94e1bdbbce3bed766bec6229dadc7dae60`. The refined public model test passed in 21.8 seconds, exercising actual correction and grounded advisor text with protected fields and explicit interpretation labels. The full 11-case public suite had already passed on the preceding completion runtime; only the advisor path changed afterward and was checked again. Latest unit suite: **46 passed, one opt-in live unit test skipped**. Production build, TypeScript and [GitHub CI](https://github.com/marwanehmamouchi05/tastekey-relay/actions/runs/40482122440) passed. Dependency audit reported no known vulnerabilities.

Final host checks confirmed the non-root user, restart policy, mode-600 root environment, mode-700 backup directory, enabled timer, successful backup service and ample disk space. A fresh private off-host snapshot passed integrity checking after final verification. The retention installer now expires both daily and predeployment host snapshots after seven days. CloudShell's temporary credential staging file was removed and absence verified. The temporary PC SSH CIDR was removed; the console confirms **Lightsail browser SSH only**.

The Devpost draft has four of five steps complete, including the confirmed October 26 start date, story, live/source links, cover and four labeled integration screenshots. The final rules/terms checkbox is unselected and the project is not submitted. The owner must review and perform that final step. Independent user evaluations and real booking/customer-demand evidence remain outside the verified claims above.
