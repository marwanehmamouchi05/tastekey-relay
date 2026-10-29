## Inspiration

Every website starts again when learning what we like. Small businesses face a similar problem when choosing an offering, screening or campaign. Cultural taste can help, but a love of luxury design should never silently become a luxury spending budget.

TasteKey Relay connects a user-controlled taste identity with a practical cultural strategy workflow for small businesses. Our initial business segment is independent cinemas and experience businesses without a dedicated analytics team—not an invented existing customer base.

## What it does

**Personal** keeps your editable likes in your browser. Start with a search or use “Not sure? Help me choose” to tap multiple-choice examples. Review a canonical Qloo result before saving it. Optional clarification separates your stated taste from unverified guesses. You can reject an interpretation and correct a hotel budget while keeping unrelated interests.

In Suggestions, choose exactly which likes to share for entertainment, shopping or travel for 24 hours. Qloo supplies real film, TV, brand and destination relationships. Stop sharing revokes the context and clears its results, including stale pending responses. Practical budgets remain separate. Shopping samples are fictional; travel destinations are inspiration, with optional filtering of user-entered checked quotes, not verified booking availability.

**Studio** turns a saved business brief, goal, catalog, budget and reviewed cultural references into a traceable investigation. Qloo returns cultural evidence; Studio builds bounded pilot proposals, shows risks and dependencies, compares city/budget scenarios, saves action plans and records owner-reported outcomes. Rejections and past reports inform later planning. Optional Amazon Nova Micro can interpret a correction or help word proposals, while server validation protects IDs, costs, evidence links and ownership. The owner still checks factual claims and feasibility.

Core Personal and Studio demonstrations need no registration. Advanced collaboration supports Cognito-backed verified email, team roles and email-bound invitations. Audience contributions are separately consented, expire after 30 days and are suppressed below ten active verified accounts, with additional small-group safeguards. Verified email does not prove unique people, and no real customer population is claimed.

Optional integrations include a Chrome/Edge developer extension that filters supported visible result cards locally, and an embeddable business widget. Visitors explicitly choose likes inside a TasteKey popup; matching stays in the TasteKey frame rather than sending a raw profile to the merchant. Publishing real offers requires a verified owner/admin and a connected website. Neither a paid-ad network nor a Chrome Web Store release is claimed.

## Why Qloo matters

The application resolves reviewed references to actual Qloo entity IDs, queries the event API and retains source records. In Studio, removing Qloo leaves an input-only generic planning rule; it cannot supply those returned cultural entities and links. Qloo grounds what the agent investigates, while TasteKey manages clarification, context permission, constraints, review and the next saved action. Cultural affinity is not a probability that an individual will like something or evidence of local demand.

## How we built it

TypeScript, Next.js, React Flow and SQLite support both experiences. Reusable taste, privacy, investigation and evaluation modules share explicit types. The server-side event harness uses bounded concurrency, timeout, caching and limited transient retry. OpenID Connect uses PKCE, state, nonce and explicit ID-token signature checks. Tenant/role checks protect server records. The non-root Node container runs behind Caddy HTTPS on Lightsail with persistent disk, consistent SQLite backups, rollback and public revision reporting. Bedrock uses a restricted identity and persistent daily call cap. No secret belongs in the browser or public repository.

## What we tested—and learned

The readiness check passed 80 unit/integration tests, including actual Qloo calls, plus 21 local browser checks. Public Qloo and Bedrock journeys passed. A later browser-runner interruption caused three context-setup failures before app navigation; all three passed on focused retry. We preserve this distinction in the release audit rather than claim one uninterrupted clean run.

We also ran a frozen **public-list proxy benchmark**, because real volunteer testers were unavailable. Agents researched five public BFI film ballots; the script sent only seed identities to Qloo and scored held-out title overlap. Only one of 25 held-out titles appeared in the candidate pools. A fixed simulated “Emotional storytelling” answer worsened that match from rank 3 to 9. This **does not prove recommendation improvement**. The people whose ballots were public did not participate or endorse the app; title linkage is provisional, and the comparison shares Qloo's candidate pool.

Three synthetic Studio cases returned real Qloo evidence, kept allocations within budget and linked all 12 assisted proposals to returned evidence. Those are mechanical checks, not business usefulness or revenue results. [Method, data, results and limitations](https://github.com/marwanehmamouchi05/tastekey-relay/blob/main/docs/RESULTS.md) are public, including negative findings.

The audit corrected a duplicated evaluation calculation, a request-size guard that buffered too much data, and a widget popup that could claim success without confirmation. Our most useful lesson was to treat clarification and evidence as things to test, not reasons to assert accuracy.

The October 29 follow-up replaces a global substring sort with a confirmed metadata hint bounded to one position, keeps unchosen reasons uncertain, displays Qloo release years for disambiguation, excludes already-used reference IDs from new suggestions and shares identical in-flight provider requests. A new frozen two-list diagnostic used 14 real provider attempts and no model calls. Requesting 20 instead of 12 found one more held-out title but no top-three gain, so production stays at 12. The revised simulated-answer ranking did not improve those new pools. The editorial no-Qloo baseline's same-poll contamination is disclosed. These findings support safety and correctness, not an accuracy advantage.

## What is next

Genuine independent preference comparisons and business-owner judgments are the next validation. A Studio subscription is a business hypothesis, not validated pricing. A real verified account completed login, refresh persistence, Owner team access and sign-out; fresh registration and code entry were not observed in this pass. Corporate identity federation, unique-human proof, live booking/pricing feeds, normal-browser extension activation and actual merchant installation remain explicit limits.

## Try it

- [Quick tour—no account needed](https://tastekey.52.47.205.18.sslip.io/tour)
- [Personal](https://tastekey.52.47.205.18.sslip.io/personal/discover)
- [Studio](https://tastekey.52.47.205.18.sslip.io/studio/onboarding)
- [Optional integrations](https://tastekey.52.47.205.18.sslip.io/integrations)
- [MIT source, release audit and reproducible evidence](https://github.com/marwanehmamouchi05/tastekey-relay)

## Actual interface captures

Real Qloo suggestions using test tastes; not a recommendation-quality claim:

![Personal Qloo suggestions](https://raw.githubusercontent.com/marwanehmamouchi05/tastekey-relay/main/docs/screenshots/finalist-public/personal-qloo.png)

Real Qloo analysis of an explicitly synthetic cinema brief; allocations are planning bounds, not supplier quotes or a sales forecast:

![Studio with real Qloo evidence and a synthetic business brief](https://raw.githubusercontent.com/marwanehmamouchi05/tastekey-relay/main/docs/screenshots/finalist-public/studio-qloo.png)
