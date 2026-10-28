# TasteKey Relay — submission handoff

Saved Devpost draft: https://devpost.com/submit-to/31054-qloo-agentic-hackathon/manage/submissions/1267250-tastekey-relay/finalization

Project preview: https://devpost.com/software/tastekey-relay

**Draft saved; not submitted.** Four of five Devpost steps are complete. The final page requires the owner to agree to the Official Rules and Devpost Terms of Service, review eligibility and submit. No legal attestation has been accepted by the agent. The owner confirmed October 26, 2026 as the start date; source history starts that day. A comparison with the other local application source found no identical source files or matching twelve-line substantive blocks; it is evidence of the audit performed, not a mathematical proof of originality.

## Final readiness materials

The reviewed application is now pinned to `bbb3e095bf080882f1c6e466dd54154c8787ba15`. See the [final audit](FINAL_READINESS_AUDIT.md), [current proposed Devpost story](DEVPOST_STORY.md), [actual evaluation results](RESULTS.md), [ablation](ABLATION.md), [pitch/Q&A](FINALIST_PITCH.md) and [third-party notices](THIRD_PARTY_NOTICES.md). The in-app [Quick tour](https://tastekey.52.47.205.18.sslip.io/tour) works without registration. Current screenshots are in `docs/screenshots/finalist-public/`.

A dated, silent ~70-second actual public walkthrough with real Qloo/Bedrock and explicitly synthetic business inputs is in `docs/media/tastekey-walkthrough.webm`, with separate `.srt` subtitles and capture metadata. This optional backup recording has not been uploaded to a video host or placed in Devpost's video field. The independent-benefit experiment did not establish improvement and must not be described as a successful accuracy study.

Submission cutoff: October 31, 2026 at 04:45 Morocco time. Keep the app available through the official judging end, November 6 at 05:45 Morocco time, rather than stopping at the November 5 announcement. The owner must review the prepared material, resolve personal eligibility/rights declarations, accept the final terms, submit and confirm a receipt.

## Elevator pitch

Turn your taste into choices you control—and help small businesses turn Qloo cultural insights into traceable plans, experiments, and feedback.

## Public links

- Personal: https://tastekey.52.47.205.18.sslip.io/personal/discover
- Studio: https://tastekey.52.47.205.18.sslip.io/studio/onboarding
- Public MIT source: https://github.com/marwanehmamouchi05/tastekey-relay
- Connected demonstration: [JUDGE_GUIDE.md](JUDGE_GUIDE.md)

## Defensible project story

Personalization starts over on every site. Cultural tastes can help discovery, but aesthetic preferences should not silently become spending assumptions. Small businesses face a related gap between cultural affinity and a practical next step.

TasteKey Personal develops an editable taste graph, asks adaptive clarification questions and preserves unverified possibilities until the person answers. People can reject interpretations, correct budgets independently of aesthetics and grant selected fields to entertainment, shopping or travel for 24 hours. Qloo supplies real movie, TV, brand and destination inspiration. Optional AI corrections send only the submitted text and require review before application. Dated accommodation quotes can be checked by the user and filtered locally by returned destination, freshness, date and USD budget. The app does not invent offers.

TasteKey Studio saves a private business brief, investigates reviewed references and city signals, shows cultural evidence and constrained pilot allocations, compares scenarios and creates editable action plans. Rejections and owner-reported outcomes inform subsequent investigations. Optional Nova Micro proposes pilot interpretations with explicit owner-validation labels. Slot validation and server-controlled fields preserve strategy IDs, costs, ownership and evidence links; invalid proposals retain the baseline.

The two products connect through explicit category-only consent. Owners can invite contributions; people sign in with a verified email, preview the business, choose broad categories and withdraw. Contributions expire after 30 days. Reports require ten active verified-account contributions and suppress small groups and complements. Legacy anonymous contributions are excluded; team members cannot contribute to their own business audience. No individual graph or email is available in reports. Verified accounts do not prove independent people, and no differential privacy is claimed.

Studio now supports Cognito-backed OpenID Connect sign-in, email-bound team invitations, workspace switching, owner/admin/editor/viewer roles, immediate revocation, ownership transfer and an access audit. The simpler interface starts Personal with one search, uses plain-English navigation and keeps examples, follow-up questions and the map optional. Passwords and verification codes stay with the identity provider; the personal graph stays in the browser.

A downloadable developer browser extension filters supported result cards locally using explicitly chosen likes/words and an optional same-currency budget. A separate business widget publishes manually entered offers on the connected website. Visitors select likes in a TasteKey popup; a TasteKey-owned frame sorts offers without disclosing their list to the merchant, and clears choices after fifteen minutes or frame close. The extension is not a Chrome Web Store release; live compatibility with every site and actual customer/sales growth are not claimed. Public sample offers/prices are clearly synthetic.

The implementation uses TypeScript, Next.js, Tailwind, React Flow, the event-supported Qloo harness, SQLite, Amazon Bedrock Nova Micro, AWS Lightsail and Caddy HTTPS. The app runs as a non-root user with private server credentials, tenant authorization, nonce script CSP, consistent backups and deployment rollback. The model identity is restricted to the server IP, Nova resources and a 30-day window; daily attempted model usage is capped in SQLite.

Real integration checks cover cultural entity resolution, cross-category relationships, location, explainability, five Studio industry types and live AI correction/advice. Tests cover consent, protected fields, recovery, persistence, scenarios, failures, isolation and mobile layout. See STATUS.md for exact runs, revisions and screenshots.

## Claims deliberately excluded

No independent user study, recommendation-quality gain, customer demand, conversion lift or revenue result has been collected. Shopping products/prices are illustrative. Travel quotes are supplied by the user and are not independently verified bookable offers. Human reviewer aliases and reported outcomes are not audited. Corporate SAML federation/SCIM, proof of unique people, live booking/pricing feeds and controlled human evaluation remain outside this release. The owner has no booking/merchant provider account configured.

## Prepared media

- `docs/media/thumbnail.svg` and `thumbnail.png`: original vector cover and rendered upload.
- Devpost gallery: actual Qloo entertainment results and actual Qloo Studio evidence for an explicitly synthetic cinema brief, with captions stating the limits.
- `docs/screenshots/completion/`: public acceptance captures, including real model integration and separate synthetic manual-quote fixture.
- `docs/screenshots/completion-refined/`: final advisor/correction verification after the refinement, when present.
- `docs/screenshots/redesign/`: October 28 desktop/mobile and team interface checks with explicitly synthetic local fixtures.
- `docs/screenshots/redesign-public/`: October 28 public browser checks, including actual Qloo and Bedrock responses and separately labeled quote fixtures. The updated draft story embeds the new interface previews; the four older gallery captions identify the October 27 interface.
- `docs/screenshots/simple/` and `docs/screenshots/integrations/`: plain-English interface, optional tools, unpacked-extension popup and synthetic business widget/consent flow.

The video field is left empty. A video was not required by the competition page at preparation time. Never fill it with an unproduced or unrelated link. Maintain valid credentials and the public deployment throughout judging. The scoped model identity expires November 26, 2026.
