# Acceptance and handoff status

Updated October 29, 2026. Implemented behavior and actual integration evidence are recorded separately from user-study claims.

## October 29: final improvement and verification

Reviewed application `811044002cec6f70790447fffcf0b4d203826792` adds a negative-label abstention guard to `a18050d`. See the [complete mission report](FINAL_MISSION_REPORT_2026-10-29.md) for the final deployment identity, tests and owner actions. Final local checks passed 89 unit/integration tests with real Qloo, 22 browser cases with two intentional live skips, build and TypeScript; [CI passed](https://github.com/marwanehmamouchi05/tastekey-relay/actions/runs/40856168263). The final deployed release passed a clean 21-case public suite in 4.6 minutes with three intentional local-only skips, including actual Qloo and Bedrock. The immediately previous checkpoint also passed a clean 21-case public run.

The conservative metadata rule moves a complete confirmed match at most one place and abstains on weak or negative wording. Unchosen reasons remain uncertain; seed/duplicate suggestions are excluded; provider years assist identity review; identical in-flight calls share work. The fresh diagnostic did not demonstrate an accuracy advantage, so production remains at 12 candidates. Real existing-account login, refresh, Owner access and logout passed; fresh registration/code delivery were not observed. The required host restart and disposable-record persistence check completed successfully. Devpost’s updated story and five October 29 captures were saved and verified; it remains an owner-controlled unsubmitted draft.

## Previous October 28 release: finalist readiness and bounded evidence

The deployed application is `bbb3e095bf080882f1c6e466dd54154c8787ba15`. Its inspected image revision label and public `/api/status` agree. The [final audit](FINAL_READINESS_AUDIT.md) records the image digest, environment-presence, database/backup checks, fixes and remaining owner gates. Source CI passed. Verification passed **80 unit/integration tests** with real Qloo enabled and **21 local browser checks**, skipping the two provider cases exercised publicly. The public run passed seventeen cases but had three browser-context setup failures across a long runner interruption; all three passed on focused retry. All **twenty applicable public cases** therefore passed across the runs, with three intentional local-only fixture/concurrency skips. This is not described as one clean uninterrupted full public run.

The [Quick tour](https://tastekey.52.47.205.18.sslip.io/tour) preserves both working products without registration. Comparison/context consistency, bounded body streaming and acknowledged widget consent are fixed. A silent dated public walkthrough, subtitles, curated current screenshots, proposed Devpost copy and a 90-second pitch are prepared. See [submission materials](SUBMISSION.md).

The [public-list proxy](RESULTS.md) did not establish better recommendations: one of 25 held-out titles appeared in Qloo's pools, and fixed simulated verification worsened its rank. Three synthetic Studio cases passed evidence/budget contracts without proving usefulness. Final Devpost acceptance/submission and owner-operated password/email verification remain handoffs. Six-hour read-only availability monitoring was created through November 6, 2026 at 05:45 Morocco time; it is not an uptime guarantee. Later documentation/media/test-tool commits do not change the pinned runtime.

## Previous release: optional multiple-choice Start

Application revision `299a4c2ec1528bfb3c67ebcec9441b6667e31f93` is deployed. Start now offers “I know what I like” and “Not sure? Help me choose”. The optional guided path asks for a topic, then offers familiar examples. Film/music/book/place choices use the existing Qloo search and require selecting a result before saving. Style choices require a separate Add this style confirmation. People can change topics or switch to typing; examples are not represented as personalized recommendations.

Validation: production build, TypeScript, formatting, **70 unit/integration tests** and **16 local browser tests** passed. One credential-gated unit and two live-provider browser cases were skipped locally. The focused public guided browser test passed using explicitly synthetic search responses for failure/empty/confirmation coverage. A separate isolated public smoke check used actual Qloo search: HTTP 200, five returned entities, no save before confirmation, and confirmed local persistence after reload. An early smoke invocation loaded the old deployment while the image was still building and timed out; the fresh post-deployment check passed. [Runtime CI passed](https://github.com/marwanehmamouchi05/tastekey-relay/actions/runs/40729443800).

Deployment used the existing Lightsail browser SSH connection without changing firewall rules or creating credentials. HTTPS health and a consistent backup passed. The previous release's full public provider checks below remain historical evidence; they were not all rerun for this interface change. The independent report-only review instructions are in [ASTRA_AUDIT_PROMPT.md](ASTRA_AUDIT_PROMPT.md). A final hackathon eligibility determination is not claimed by this update.

## Previous release: simpler screens and optional integrations

Application revision `9ecd1eae3c6c54133bee3f8690f417a1176ec1c6` includes the verified-account foundation below, the plain-English simplification from `ced13c2`, and optional browser/business integrations. Personal now starts with one task; examples, follow-up questions and the map stay closed until requested. Navigation says Start, Your likes, Suggestions and Privacy. Studio keeps its less common tools under More tools.

The downloadable Chrome/Edge developer extension filters supported visible result cards using selected likes/words and an optional same-currency budget. It restores hidden cards, avoids sign-in/payment forms, keeps copied likes locally and requests no broad host permissions. It is not a Chrome Web Store release. Live compatibility with every external website's changing DOM and the owner's normal-browser action-click installation are not inferred from fixture tests.

Studio's website widget publishes only explicitly marked business offers, restricts offer links to the connected website and enables publishing only for verified owners/admins. Visitors explicitly select likes in a popup; sorting happens inside a TasteKey frame, with no profile/visitor list sent to the merchant. Selected likes clear after fifteen minutes or frame close and can be cleared immediately. This is an opt-in on-site offer tool, not a paid-ad network or evidence of customer/sales growth. The public sample is clearly synthetic. See [integration setup and boundaries](INTEGRATIONS.md).

Local validation: **70 unit/integration tests passed**, one credential-gated live unit test skipped; **15 browser checks passed**, with two live provider cases deliberately skipped locally. Build, TypeScript, formatting, dependency audit and secret-exposure checks passed. The browser checks cover real popup consent, offer order/clearing, draft exclusion, the extension's actual isolated-browser loading/permissions/local deletion, and synthetic result-card filtering/restoration.

Production checkpoint: `tastekey-relay:9ecd1eae3c6c` is deployed on HTTPS as non-root `node`, with persistent storage and automatic restart. **15 public browser/API checks passed in 3.3 minutes**; the two account/database-seeded cases were intentionally skipped on production and passed locally. The public run includes real Qloo, real Bedrock, the live extension download, the actual public sample widget/popup consent exchange, source-binding rejection and clearing. Its sample offers/likes remain explicitly synthetic, not real supplier/customer evidence. Captures: `docs/screenshots/integrations-public/`. [CI passed](https://github.com/marwanehmamouchi05/tastekey-relay/actions/runs/40724537651).

The dedicated Cognito service is configured and its real hosted sign-in opens through the deployed PKCE flow. Real first-account password/email-code completion remains an owner handoff, so that entire live registration round trip is not claimed verified. Offer publishing requires a verified owner/admin and an actual business website; no external merchant site was supplied or modified. The owner's normal browser extension installation and Chrome Web Store publication were not performed. No advertising messages were sent.

The Devpost draft story and previews now describe the simpler interface and both optional integrations. It remains 4/5 steps, unsubmitted, with final rules/terms and eligibility review reserved for the owner. A consistent private off-host backup passed SQLite integrity checking after the release; the host backup timer/service and root-only environment/backup permissions passed checks.

Temporary deployment SSH ingress was removed after maintenance. The AWS console verified empty IPv4/IPv6 CIDR lists for port 22 with only the two Lightsail browser-SSH aliases retained. No new persistent administrative credential was created. That runtime checkpoint was pinned to `9ecd1ea`; subsequent documentation/test-evidence commits did not change that image. It has since been superseded by the guided Start release above.

## October 28 foundation: identity and initial interface

Reviewed release `fab4f0d23a0aea37c204b825662b8f3d7555a7b7` adds dedicated Cognito Lite verified-email OpenID Connect accounts, role-authorized teams, workspace switching/naming, email-bound single-use invitations and revocation, ownership transfer and an access audit. First sign-in secures private records and invalidates old capabilities; returning accounts preserve new private drafts separately. Provider tokens are not persisted. Corporate SAML/enterprise federation and SCIM are not configured.

Audience disclosure now counts verified accounts across sessions, excludes anonymous legacy submissions and rejects contributions to a member's own business audience. Ten-account and small-complement suppression remain enforced. Email verification does not establish unique people, a verified business or actual demand.

The initial interface release introduced a purpose-specific taste atlas with original CSS illustrations, self-hosted typography, category tiles, starting progress, keyboard input, a graph that fits new nodes and responsive navigation. The later simplification described above removes duplicate starting choices and the required-looking progress target. Studio shares the visual identity and has a dedicated team view.

Validation: **65 unit/integration tests passed; one credential-gated live unit test skipped**. These include database role/claim/invitation/revocation tests, protocol wiring tests and separate real RSA-signed token checks for wrong key, issuer, audience, nonce and expiry. Production build, TypeScript, formatting and dependency audit pass. The local browser suite passes **11 tests**, with the two live provider cases explicitly skipped locally. Local account fixtures are synthetic and are never a production login bypass. [GitHub CI passed](https://github.com/marwanehmamouchi05/tastekey-relay/actions/runs/40703682813).

The owner approved creating the dedicated identity pool and temporary PC-only SSH for deployment. No users, new IAM credentials, SMS or paid identity tier were created. Production activation, public provider checks and cleanup are recorded in the release checkpoint below once complete. Real first-account registration requires the owner's password/email-code handoff; that full live round trip is not claimed based on fixture tests.

The owner has no live booking/merchant feed account. Existing user-checked quote filtering and clearly labeled sample products remain available. No supplier inventory, independent user study, unique-human verification or external penetration audit is fabricated. The final Devpost submission/terms remain the owner's action.

## Historical October 27 acceptance evidence

The sections below describe the preceding runtime. Their capability-session limitations were superseded by the October 28 identity changes above; their live provider evidence remains separately attributable to those revisions.

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
