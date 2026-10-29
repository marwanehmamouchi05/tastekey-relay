# Final readiness audit — October 28, 2026

**The tested core product is publicly usable. Final submission and independent product benefit remain unestablished.** This audit combines a separate agent's targeted source review with implementation-agent verification. It is not an external security certification, a human user study or a prediction of finalist selection.

## Release identity and recovery

Reviewed application revision: `bbb3e095bf080882f1c6e466dd54154c8787ba15`.

The running container was inspected through the existing Lightsail browser SSH connection. Its image is `tastekey-relay:bbb3e095bf08`, image ID `sha256:c07c1a090cde85825df55e1133677ce9476060e8f1ede83ce45902bbb85a20ed`. The OCI revision label and public `/api/status` release both match the reviewed commit. The container runs as `node` with `unless-stopped` restart policy. Deployment succeeded after taking a consistent pre-deploy SQLite backup and retained the previous image for rollback. No firewall rule or persistent credential was created for this release.

Source fingerprints read inside the container matched the reviewed files:

| File                               | SHA-256                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| `apps/web/components/personal.tsx` | `71c63b0c702065ff6e19769277059b16269b462d90fba6ef96113c6c54ce7972` |
| `apps/web/components/studio.tsx`   | `4173d479fbab241d03dc09ad9e4e189686665675ac2cd3debe4f76ef246ef782` |
| `packages/qloo-adapter/index.ts`   | `88b172360bfa04b96b7a7b1457251b9acc1659286a49d1586cc28007a3962c37` |

Production audit reported HTTPS origin and required database, OIDC and Bedrock configuration present, without displaying secret values. SQLite `quick_check` returned `ok`, journal mode `wal`, and all eleven checked account/workspace/model tables existed. `user_version` is 0: this application uses additive table creation and does not yet have a numbered migration ledger. No migration was introduced by this release. Environment permissions were `600 root`; backup directory `700 root`; backup timer active and last service result successful. `scripts/audit-runtime.mjs` reproduces these non-secret presence/integrity checks inside the container.

Deployment now embeds the revision and requires the public health response to match it before accepting a release. Existing `scripts/deploy.sh` retains the known-good image/container and rolls back a failed health check; see [deployment](DEPLOYMENT.md) and [AWS operations](AWS.md). Later documentation/media/test-tool commits do not imply a different running app revision.

## Executed verification

| Check                                         | Result                                                                                  | Limit                                                                                                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/integration suite with `QLOO_RUN_LIVE=1` | **80 passed, no skips**, 14 files                                                       | Includes actual Qloo search/recommendations; other cases use explicit fixtures.                                                                                           |
| Production build, TypeScript and formatting   | Passed                                                                                  | A build is not live-runtime proof; deployment was checked separately.                                                                                                     |
| Local Chromium suite                          | **21 passed, 2 skipped**, 30.9 seconds                                                  | Two live-provider cases intentionally run on the public app instead.                                                                                                      |
| Public suite, both live providers enabled     | **17 passed, 3 browser-context setup failures, 3 intentional skips** in the first run   | Setup failures occurred before reaching app pages, across a six-hour wall-clock interruption; the underlying cause is not conclusively established.                       |
| Focused public retry                          | **3 passed**, 34 seconds                                                                | Judge tour and two widget acknowledgement cases. Together the runs cover all **20 applicable public cases**; this is not represented as one clean uninterrupted full run. |
| CI at deployed revision                       | [Passed](https://github.com/marwanehmamouchi05/tastekey-relay/actions/runs/40737101577) | CI uses local fixtures and explicitly skips live provider cases.                                                                                                          |
| Five concurrent local API journeys            | Passed, isolated records                                                                | No live provider calls; not production capacity or internet-scale load evidence.                                                                                          |
| Secret scans before source publication        | No issued Qloo or model credential matches                                              | Targeted known-key exposure scans are not a proof of absence of every possible secret.                                                                                    |

Three public skips are intentional: local concurrency, seeded team/account authorization, and seeded verified-owner widget publication. Their local equivalents passed. Real public Qloo and Bedrock, Personal correction/consent/persistence, Studio analysis/scenarios/plans/outcomes, the widget demo and extension download passed. Synthetic businesses, manual quotes and offers are labeled. [Screenshots](screenshots/finalist-public/) preserve current UI; some captures exercise fixtures and must retain their filenames/captions.

## Defects found and corrected

| Finding                                                                                       | Correction                                                                                                                                  | Acceptance evidence                                                                                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Comparison reranker differed from production and could use unrelated/unshared confirmed likes | Privacy invokes the production helper with the saved pool's current authorized context; legacy context-less pools require fresh suggestions | Comparison case verifies authorized IDs/order and rejects a withdrawn grant.                        |
| Claimed 50 KB body limit buffered bodies before rejecting them                                | Bounded UTF-8 byte reader cancels at 50,000 bytes, including absent Content-Length                                                          | Five unit cases cover chunking, byte counts, cancellation and ordinary input.                       |
| Widget popup could claim success after its connection expired or opener disappeared           | Source/origin/state/widget-bound accepted/expired acknowledgements; honest missing-ACK timeout                                              | Fresh acknowledgement, expired connection, forged wrong-source ACK and navigated opener paths pass. |
| Running revision was hard to verify externally                                                | Docker OCI revision label, runtime release value and matching deployment health check                                                       | Container inspection and public response agree with reviewed SHA.                                   |

The source review found no credible cross-tenant or raw-profile leak in its reviewed paths. Server tenant checks, role enforcement, signed-token validation and explicit widget source binding are present and tested. Model validation protects structure/IDs/costs/ownership; it does not independently fact-check every sentence. Owner validation of demand, rights, supply and capacity remains essential.

## User experience and access

The [Quick tour](https://tastekey.52.47.205.18.sslip.io/tour) supplies connected Personal and Studio paths without an account. Both core journeys were exercised from fresh isolated sessions; no shared judge password or weakened production role is needed. Verified sign-in remains necessary for team membership, audience contributions and actual widget publishing.

Desktop/mobile Chromium, visible keyboard focus, labeled forms, optional details and horizontal-overflow checks passed. Firefox and WebKit binaries were unavailable; Safari/iOS and broad cross-browser conformance were not verified. This is not a full WCAG audit or a first-time human usability study. A few advanced headings still use words such as “insight”; they are nonblocking clarity opportunities, not a reason to rebuild the interface near submission.

The actual owner-operated Cognito signup → email verification → login journey remains pending. The hosted login opens correctly and cryptographic/role fixtures pass, but these do not establish completion of a real account lifecycle. Browser rules require the owner to enter a new password and verification code. No fake production users or authentication bypasses were created.

## Evaluation and media

[RESULTS](RESULTS.md) preserves five fixed public BFI ballots and three synthetic Studio ablations. Title-linked retrieval found **1/25 held-out films**. Simulated verification worsened that match from rank 3 to 9. This does not establish recommendation superiority; the public people did not participate, and source-list membership is a weak positive proxy. No agent-generated human satisfaction or sales results are claimed. The Studio ablation verifies real evidence linkage and budget contracts, not usefulness. [ABLATION](ABLATION.md) identifies precisely what each comparison can support.

An actual public screen recording is available at [tastekey-walkthrough.webm](media/tastekey-walkthrough.webm), with [separate subtitles](media/tastekey-walkthrough.srt) and [capture metadata](media/walkthrough-capture.json). It is silent, uses synthetic business inputs, performs real Qloo/Bedrock interactions and contains no mock routes. Capture actions took 67.7 seconds; encoded playback is approximately 70 seconds. It is a dated backup, not a continuously live demo. The [pitch and Q&A](FINALIST_PITCH.md) and [judge guide](JUDGE_GUIDE.md) are prepared.

## Eligibility and submission gates

Checked against the [official rules](https://qloo.devpost.com/rules) and [submission requirements](https://qloo.devpost.com/), not the pasted report alone:

| Requirement / gate                                                                | Status                                                                            |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Public working demo and source                                                    | Observed accessible; core journeys tested                                         |
| Detectable open-source license                                                    | GitHub reports public repository with MIT license                                 |
| Actual Qloo-powered agentic workflow                                              | Demonstrated in live tests and traces                                             |
| Accurate English description/instructions                                         | Prepared; final owner review remains                                              |
| Age, residence, affiliation, ownership and third-party authorization declarations | Owner attestation required; not inferred from code                                |
| Correct event and finalized submission                                            | Correct event observed; **DRAFT 4/5**, terms unchecked, not submitted             |
| Independent benefit                                                               | Not established; limits published                                                 |
| Free availability throughout judging                                              | Operational setup and monitoring exist; ongoing availability cannot be guaranteed |

Official submission cutoff converts to **October 31, 2026 at 04:45 Africa/Casablanca**. Judging ends **November 6 at 05:45 Morocco time**, later than the November 5 announcement. Video is optional. The owner must review the rules, accept terms and submit; no agent accepted these or pressed Submit.

October 29 draft checkpoint: the current story, `/tour` as the primary demonstration URL in both relevant fields, and five current gallery screenshots with descriptive captions were saved in Devpost and verified after reopening the editor. Four historical captures retain dated October 27 captions. Finalization remained DRAFT 4/5 with unchecked terms. The optional recording remains a repository artifact, not an externally hosted Devpost video. Documentation/media commit `cfdc4f43d26e4af3fbbea8b533bdf38edd235ff7` passed CI; production remains the reviewed `bbb3e09` revision.

## Outstanding-risk register

| Risk / dependency                                  | Remaining action                                                                                                                                                                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Devpost is still a draft                           | Owner reviews eligibility/rights, final materials and legal checkbox, submits before cutoff, confirms receipt.                                                                                                                                                             |
| Real account lifecycle not completed               | Owner creates/uses account and verifies email; then test refresh, workspace access and sign-out. Core judge tour works without it.                                                                                                                                         |
| Weak proxy evaluation; no actual customers/testers | Preserve negative results. Collect genuine independent preferences/business judgments later; do not substitute agent votes.                                                                                                                                                |
| Provider limits and finite funding                 | App caps Qloo at 60 calls/hour and AI at 40/day. Model access expires November 26, after judging. Event quota/expiry is not independently confirmed with the organizer. AWS billing session expired; cached credit estimates are not represented as a fresh balance check. |
| Ongoing service availability                       | Six-hour thread monitoring was created through judging end, quiet while healthy. Once-per-UTC-day search probe uses one disposable session and no model call. The desktop automation must be able to run; this is not an uptime SLA or substitute for host recovery.       |
| Browser-context setup interruption                 | First public run had three setup failures; focused retry passed. Retain this limitation and avoid claiming a clean single-run result.                                                                                                                                      |
| Extension / merchant rollout                       | Normal-browser toolbar activation, every external site's changing DOM and actual merchant deployment remain unverified.                                                                                                                                                    |
| Inventory, factual advice and identity limits      | No live booking/pricing feeds, corporate federation or unique-person proof. Owner review of AI wording remains necessary.                                                                                                                                                  |

No major new product framework was introduced. Both Personal and Studio remain operational; further work should prioritize the owner gates and honest validation over additional feature count.
