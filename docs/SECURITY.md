# Data flows and security boundaries

| Data                                           | Storage                                               | Transmission                                             | Boundary                                                                |
| ---------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Personal graph, budgets, grants, quotes        | Browser localStorage                                  | No raw profile API                                       | Per-context, per-node allowlist; expiry and revocation                  |
| Reviewed cultural references                   | Browser; Studio SQLite                                | Server to official Qloo harness                          | Public entity IDs, category and optional business city; no budgets      |
| Correction text                                | Request memory                                        | Explicit optional model action                           | Bounded validated proposal; review before applying                      |
| Business, strategies, plans, outcomes, reviews | Persistent SQLite                                     | Browser to app server                                    | Private capability cookie; tenant-scoped queries                        |
| Business brief and evidence                    | SQLite / request memory                               | Optional model, explicitly selected                      | Model cannot change costs, evidence IDs or ownership                    |
| Audience contribution                          | SQLite, 30-day expiry                                 | Invitation, chosen broad categories and explicit consent | No graph, entity IDs, contact details or budget; participant withdrawal |
| Recovery code                                  | Hash only in SQLite                                   | User-initiated restoration to app                        | Rotated one-use code, 90-day expiry, old sessions revoked               |
| Backups                                        | Root-only host files; private off-host copy when made | Administrator-controlled                                 | Sensitive workspace snapshots; never public source                      |

## Enforced controls

- Record reads/writes and business/action relationships are authorized by tenant on the server. A visitor cannot select a tenant through the public API.
- Session tokens contain 256 random bits and are stored hashed, expire after 30 days, and use HTTP-only SameSite Strict cookies, Secure under HTTPS. Restoring a recovery code invalidates prior sessions. Recovery grants full workspace access; protect the code like a credential. It does not sync Personal localStorage.
- Writes require matching Origin. Bodies, strings, arrays, enum values and numerical constraints are bounded. Sensitive status values are never returned.
- Qloo uses an installed trusted script with an argument array and no shell. Calls have concurrency, hourly allowance and timeout controls. Raw subprocess errors do not reach clients.
- Model output is untrusted and validated. Explicit provider credentials, input/output limits, one SDK attempt and a persistent global daily allowance constrain model use. The production model identity is restricted by model resources, server IP and expiry. Configuration is unavailable after its declared expiry.
- Contexts exclude unverified, rejected, superseded and unrelated nodes. Revocation/expiry invalidates pending responses. Budgets do not go to Qloo; entertainment does not receive budget values.
- Personal deletion first withdraws contributions for the current private session, then clears local graph, grants, history, budgets, proof and quotes. If withdrawal fails, the interface reports failure. Lost cookies require recovery to access prior contributions. Studio deletion removes its records and revokes linked sessions/recovery codes.
- Audience invitations expire in 30 days. Only explicitly selected coarse categories are collected; repeat submissions from one stable private session replace the prior contribution. Withdrawal immediately removes it from reports. Reports filter expired data immediately; daily maintenance physically deletes expired contributions, invitations and recovery codes.
- Reports require ten active browser-session contributions. A group is disclosed only at count >=10 and with a complement of zero or >=10. No individual IDs or suppressed total counts are returned. These controls are not differential privacy and do not establish independent humans.
- Nonce-based script CSP, framing denial, restrictive browser permissions and HTTPS headers are deployed. Inline styles remain allowed for React Flow positioning. React escapes text rather than interpreting model HTML.
- Logs contain operation path and exception type, not prompts or credentials. Traces preserve selected business inputs and public cultural evidence; exports contain private business data.
- Online SQLite snapshots are integrity checked, private and retained on the host for roughly seven days. Deletion cannot recall exports or already copied backups. Backups can retain withdrawn/expired data until retention ends.

## Limits before broader production use

Capability sessions and recovery are not business SSO, identity verification or team roles. A stolen cookie or recovery code grants access. Shared browser profiles share access. Personal data is unencrypted browser storage accessible to same-origin scripts. Client source security, dependencies and device protection remain important.

SQLite assumes persistent disk and one app replica. Host snapshots alone do not survive host loss; a separate off-host backup and tested restoration are required. Session/Qloo request counters are process-local and reset on restart; model daily usage is persisted. Session throttling trusts proxy forwarding headers, which the reverse proxy must sanitize. Distributed enforcement and longer-term retention policy remain future work.

Audience browser sessions can be recreated and are not verified people. Small-count suppression cannot prevent every inference attack. Existing exports cannot be recalled after withdrawal. No real customer dataset or independent privacy audit is claimed.

Optional models receive explicitly submitted text or business briefs. Avoid customer identifiers or sensitive records; provider retention follows provider terms. Cultural search text is user supplied and is not an automatic identifier-redaction service. Human reviewer aliases and owner-reported outcomes are not independently audited.

Tests cover cross-tenant access, cross-origin writes, invalid/recovered sessions, consent expiry/revocation, suppression, withdrawal, protected model fields and backup integrity. Passing these tests is not a penetration test.
