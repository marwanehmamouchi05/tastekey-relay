# Component verification — October 28, 2026

Historical October 28 checkpoint. See the [October 29 mission report](FINAL_MISSION_REPORT_2026-10-29.md) for later fixes and fresh verification.

This is a fresh verification by the implementation agent, not an independent Astra audit. No application code or infrastructure was changed during this check.

Source inspected: `9b9990f8783a55393e4eab68c759766b08cb44a0`. The working tree was clean before verification. Public checks targeted https://tastekey.52.47.205.18.sslip.io. The previously recorded deployed application revision is `299a4c2ec1528bfb3c67ebcec9441b6667e31f93`; the source HEAD also contains documentation. This check did not independently inspect the running container's revision.

| Component                        | Verified status                                          | Evidence and scope                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product concept and architecture | Defined and implemented                                  | Personal UI, Studio UI, taste/privacy engines, Qloo adapter, orchestrator, evaluation module, server authorization and SQLite persistence exist in source and are exercised by the passing checks below.                                                                                                                                                           |
| TasteKey Personal                | Core implementation verified                             | Guided choices, confirmation before save, optional verification, reload persistence, correction, independent budgets, context sharing, revocation including pending requests, export/deletion paths and mobile navigation passed. Actual Qloo entertainment/shopping/travel requests and real Bedrock correction passed on the public app.                         |
| TasteKey Studio                  | Core implementation verified                             | Save/reopen business, baseline and live analysis, strategy acceptance, action plan, scenario, reported outcome and feedback paths passed. Real Qloo analysis/scenario and Bedrock advisor passed; advisor checks require live mode, actual model use and preserved evidence/cost constraints. Inputs and outcomes in these checks are explicitly synthetic.        |
| Qloo API integration             | Live integration verified                                | The direct credential-enabled search/recommendation test passed. Public browser tests also passed actual Qloo search, movie/brand/destination recommendations and Studio analysis/scenario. The public live-provider tests do not mock the Qloo response. This proves those integration paths at test time, not all possible API inputs or recommendation quality. |
| Automated tests                  | Verified                                                 | 71 unit/integration tests passed with the live Qloo case enabled; 16 local browser checks passed, with two live-provider cases intentionally skipped locally and exercised on the public app. The public run passed 16 checks, skipping the two local account/database-seeded fixtures. Production build, TypeScript and formatting checks passed.                 |
| Benchmarks                       | Metric implementation verified; product benefit unproven | Tests validate identical candidate pools, reject missing held-out choices and calculate Hit@3 / first relevant rank on synthetic fixtures. The persisted human-rating workflow also passed. No independent participant study, controlled ranking comparison, load/capacity benchmark or measured sales lift was performed.                                         |

## Commands and results

From the repository root using pinned pnpm 10.20.0:

- `QLOO_RUN_LIVE=1 pnpm test`: **71 passed, 0 skipped** across 12 test files. Actual Qloo search and recommendations were enabled.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm format:check`: passed.
- `PLAYWRIGHT_SCREENSHOTS=test-results/verification-local pnpm test:e2e`: **16 passed, 2 skipped**, 26.7 seconds. The two live-provider cases require explicit opt-in and were enabled in the separate public run.
- `PLAYWRIGHT_BASE_URL=https://tastekey.52.47.205.18.sslip.io PLAYWRIGHT_SCREENSHOTS=test-results/verification-public QLOO_BROWSER_LIVE=1 MODEL_BROWSER_LIVE=1 pnpm test:e2e`: **16 passed, 2 skipped**. Public pacing intentionally limits session creation. The skipped fixtures seed local account/database records and passed in the local run. Passing public cases include both live Qloo and live Bedrock.

Environment assignments above use compact notation; PowerShell uses `$env:NAME='value'` before the command. Test durations are execution timings, not a controlled performance benchmark. Repeated cases across local/public runs are not counted as unique features or independent observations.

## Boundaries that remain

- A full owner-operated Cognito account sign-up, email verification and subsequent login round trip remains unverified. Hosted sign-in opening, signature/state/nonce handling and local team-role authorization fixtures do not substitute for that real round trip.
- Corporate identity federation is not configured; verified email does not prove a unique human or verified business identity.
- The isolated extension loads and its permissions/storage/deletion and synthetic card filtering pass. Manual toolbar activation in the owner's normal browser and compatibility with every third-party site remain unverified.
- The public synthetic widget consent/order/reset flow passes. A real merchant website installation was not supplied. Local verified-owner offer publication/role fixtures passed; the production equivalent is not claimed as an owner-completed account flow.
- No live hotel booking or merchant pricing feed is configured. User-entered quotes and clearly marked synthetic offers are not verified availability or market prices.
- No independent quality benchmark, customer study, causal revenue claim or general security certification follows from passing these functional tests. See [EVALUATION.md](EVALUATION.md) for the intended evaluation protocol.

These results replace “implementation not verified” for the tested core Personal and Studio paths, and “not verified” for the tested Qloo integration and automated test suite. The remaining limits should stay explicit when sharing the status table.
