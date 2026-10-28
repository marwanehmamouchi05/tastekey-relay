# Prompt to copy into Astra

You are an independent QA engineer, security reviewer and hackathon submission reviewer. Audit TasteKey Relay and return a report that another coding agent can use to fix confirmed problems. **Do not fix, implement, refactor, deploy, commit, push or modify application code or configuration.** Do not treat the previous agent's claims, documentation or passing tests as proof. Check them independently.

## Targets and context

- Local repository: `C:\Users\marwa\OneDrive\Documents\ChatGPT\Qloo Agentic Hackathon\tastekey-relay`
- Public source: https://github.com/marwanehmamouchi05/tastekey-relay
- Live app: https://tastekey.52.47.205.18.sslip.io
- Start: `/personal/discover`; likes: `/personal/taste-dna`; suggestions: `/personal/relay`; privacy: `/personal/proof`.
- Studio: `/studio/onboarding`; account: `/account`; browser extension and business widget: `/integrations`.
- Devpost project: https://devpost.com/software/tastekey-relay
- Owner's Devpost draft: https://devpost.com/submit-to/31054-qloo-agentic-hackathon/manage/submissions/1267250-tastekey-relay/finalization
- Competition: Qloo Agentic Hackathon, Devpost event ID 31054. Locate the exact official event and rules from Devpost; do not substitute a similarly named event or a past edition.
- Qloo event developer guide: https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
- Owner previously reported a project start date of October 26, 2026, with no earlier application code. Check source history and compatibility with the official build window; distinguish owner declarations from independently established facts. Investigate any evidence of reused Nodum code or assets and required attribution. Do not silently correct dates or make eligibility declarations for the owner.

Read repository instructions and relevant docs, including README, docs/STATUS.md, JUDGE_GUIDE.md, IDENTITY.md, INTEGRATIONS.md, SECURITY.md, SUBMISSION.md and AWS.md. Separate current claims from dated historical checkpoints. Record the audited Git SHA, dirty changes, live revision if independently obtainable, URLs and audit time. If the live revision cannot be established, say so; do not assume it matches local HEAD.

## Boundaries

- Produce findings only. The sole intended deliverable is a Markdown audit report; you may save it to `ASTRA-AUDIT-REPORT.md` in the workspace or return the complete report in chat. Generated test outputs are allowed; do not edit source, lockfiles, dependencies, settings or infrastructure to make tests pass.
- Run existing safe checks and use isolated browser contexts with clearly synthetic data. Review scripts before running them. Use a separate temporary test database rather than overwriting existing records. Prefer local fixtures for destructive, authorization and abuse tests. No load tests, mass account creation, real invitations, email campaigns or attacks on third-party sites.
- Do not delete or alter real production data, change AWS access, create credentials, purchase anything, install software in the owner's normal browser or submit the Devpost entry. Do not accept rules or terms on the owner's behalf. You may inspect the draft read-only if accessible.
- Never display, copy into the report or commit credentials, cookies, session tokens, personal data or private environment files. For credentials already configured locally, use them only through the existing app/provider checks and redact outputs. Keep live API requests minimal; do not raise quota or spending limits.
- Ask only when a genuinely necessary action requires the owner. If authentication, email verification, paid-provider access or browser activation cannot be tested, mark that scenario **Blocked / Not tested** with the reason. Do not bypass it or equate mock coverage with a completed live test.

## Functional audit

1. Personal Start: both typing and the new “Not sure? Help me choose” flow. Check topic choices, example selection, confirmed search results, style confirmation, empty/error/loading states, switching modes, repeated actions and no unintended saves. Then verify optional follow-up answers, persistence after reload, editing/removing likes, correction review, export/delete in disposable local profiles, and separate budget controls.
2. Suggestions: selected-field sharing, context isolation, expiration, revocation while a request is pending, shopping/travel limits, and correct provenance. Distinguish real Qloo entities, static examples, user-entered quotes and actual availability. Check that optional AI failure preserves a usable, clearly labeled baseline.
3. Studio: save and reopen a business, evidence-based analysis, optional AI, accept/reject/revise, scenarios, action plans and outcomes. Check tenant isolation and that predictions, owner-reported outcomes and measured results are labeled honestly.
4. Identity and teams: OIDC/PKCE/state/nonce/signature checks, verified-email requirement, session expiry, sign-out, workspace claiming/switching, role permissions enforced at the server, invitations, revocation and ownership transfer. Review whether claimed business SSO is only standard hosted sign-in or actually configured corporate federation. Do not claim a full real account round-trip unless completed with owner-authorized accounts.
5. Audience: explicit consent, preview, withdrawal, expiry, verified-account deduplication, prohibition on own-team contributions, minimum group/complement suppression, and no individual data leaks. Verified email must not be represented as proof of a unique human or verified company.
6. Browser extension: inspect the packaged ZIP as well as source, manifest permissions, explicit activation, selected likes only, local storage and deletion, matching/budget behavior, restoring hidden cards and unsupported pages. Separate isolated fixtures from real browser-toolbar activation and actual third-party site compatibility; do not claim support solely from selectors in source.
7. Business widget: draft versus published offers, role enforcement, registered website origin, iframe/CSP boundaries, popup origin/source/state binding, explicit choice consent, timeout, clearing/reset and disabled widget behavior. Test that the embedding business cannot obtain raw likes or private business data. Separate the synthetic bookshop demo from a real merchant installation. Assess stale-consent/expiry messages as well as security rejection behavior.
8. UI: desktop and mobile, keyboard-only navigation, focus, readable contrast, clear labels/errors, no horizontal overflow, and whether a first-time user understands what to do without technical knowledge. Report concrete confusing screens rather than imposing a new design preference.
9. Operations and security: inspect input validation, authorization, secrets handling, log redaction, CSP and other headers, rate limits, cost limits, dependency checks, data retention, persistence and backup/restore evidence. Do not change cloud configuration or reboot production. Identify expiry dependencies and distinguish observed safeguards from untested assumptions. This is a scoped review, not certification of complete security.

Use existing unit/integration tests, type checking, production build and browser tests where available. Record commands, exit status, pass/fail/skip counts and the meaning of skips. Read tests critically for mock-only or circular assertions. For third-party library/API behavior, consult current primary documentation (Context7 where available); do not install or upgrade dependencies as part of this audit.

## Hackathon eligibility and submission audit

Browse the exact official event page, official rules, requirements and judging criteria as they exist at audit time. Cite direct URLs, section names, dates and brief relevant excerpts. If inaccessible or ambiguous, explicitly report that rather than infer compliance from the draft.

Create a requirement-by-requirement matrix covering, where specified: participant age/residency and excluded parties; team size and membership; submission deadline and timezone; permitted build window and pre-existing work; AI/agent and Qloo integration requirements; allowed models/tools; originality, open-source licenses and asset rights; public repository/access/license requirements; working hosted demo; video requirement, duration and accessibility; written submission fields; disclosures/attribution; judging access and final submission/terms status. Separate mandatory rules from optional recommendations. Do not invent requirements that the rules do not contain.

For every rule, use **Pass / Fail / Unknown / Not applicable**, with an official source and project evidence. Personal eligibility facts not available to you must remain Unknown and become explicit owner questions. Compare the Devpost narrative/screenshots with actual current behavior; flag overstated functionality, fictional prices, unproven business benefits and stale screenshots. Confirm whether the entry is still a draft rather than submitted, without pressing Submit or accepting terms. Explain how missing information affects readiness; do not give an unconditional legal eligibility guarantee.

## Required report

Start with a brief plain-English verdict: what works, what is broken, what is unverified, and whether any observed issue blocks a demo or submission.

Then provide:

1. Scope, environment, revisions and limitations.
2. Test results table: scenario, local/live/mock, evidence, status and limitations.
3. Hackathon requirement matrix with official citations.
4. Prioritized findings with stable IDs (`TK-001`, etc.). For each: severity (Critical/High/Medium/Low), confidence, concise title, affected URL and source file/line if established, prerequisites, exact reproduction steps, expected versus actual result, sanitized evidence, user/security/submission impact, suggested correction direction **without implementation**, and an acceptance test the fixing agent should run. Consolidate duplicate root causes. Separate confirmed bugs, missing required features, owner setup, usability suggestions and unverified risks.
5. A correction queue in dependency order, identifying what a coding agent can fix and what needs the owner/provider. Do not turn optional enhancements into mandatory hackathon blockers.
6. Remaining owner questions and a final verification checklist for the correcting agent.

Be skeptical but fair. A passing automated test is evidence for that tested path only. An inaccessible path is not automatically a defect. “Everything works” is not an acceptable conclusion without bounded evidence. **Stop after delivering the report. Make no corrections.**
