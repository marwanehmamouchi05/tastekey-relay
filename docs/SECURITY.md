# Data flows and security boundaries

| Data                                 | Storage                                    | Transmission                                   | Boundary                                                            |
| ------------------------------------ | ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------- |
| Personal graph, budgets, grants      | This browser's localStorage                | No raw profile API                             | Context/category allowlist and per-node grant                       |
| Selected cultural references         | Browser; business DB for Studio references | Server -> official Qloo harness                | Public entity IDs and optional business city only                   |
| Correction text                      | In-memory UI                               | Optional model, only after explicit action     | Validated add/budget proposal; user reviews before applying         |
| Business, strategy, plan, outcome    | SQLite on persistent disk                  | This browser -> application server             | Random private HTTP-only cookie, tenant-scoped queries              |
| Business brief and cultural evidence | SQLite / request memory                    | Optional configured model, explicitly selected | Validated text fields cannot alter costs, evidence IDs or ownership |
| Audience aggregate                   | None                                       | None                                           | Collection not active; disclosure threshold foundation only         |

## Enforced controls

- All record reads/updates are scoped by tenant, and business/action relationships are authorized on the server.
- Session token: 256 random bits, SHA-256 hash in database, 30-day expiry, HTTP-only, SameSite Strict, Secure under HTTPS. No public endpoint accepts a tenant selector.
- Write operations require a matching Origin. JSON bodies, strings, arrays, budgets and enum values are bounded and validated. No credentials are returned in status responses.
- Qloo calls use `execFile(process.execPath, args)` with a trusted installed script, not shell evaluation. Model output is untrusted, parsed and validated. React text rendering avoids HTML interpretation.
- Personal context access excludes unverified, rejected, superseded and unrelated preferences. Budgets never travel to Qloo. Entertainment never receives budget values.
- Personal deletion clears graph, grants, history, budgets, cached proof pool and experiments. Studio deletion removes all session records and invalidates the cookie.
- Logs include operation path and exception type only. Raw subprocess errors are never returned to clients. Cultural result traces do not contain private model prompts or credentials.
- Security headers deny framing and unnecessary camera, microphone and location access.

## Limits requiring work before production

- Demo capability sessions are not full business authentication: no password/login, role management, recovery, invitation, or cross-device access. Anyone with a copied cookie has that session's access. Shared browser profiles share session access.
- Browser-local data is not encrypted and is accessible to scripts running on the same origin. Protect deployment credentials, dependencies and browser devices; deploy a reviewed CSP before broad production use.
- SQLite requires persistent disk, access-restricted host permissions, backups and a single application replica. This is not a multi-region database architecture.
- Request counters are in process memory and reset on restart. Session creation throttling trusts the reverse proxy's forwarding header; the proxy must sanitize it. A distributed rate limiter and retention/garbage-collection policy are needed at scale.
- Minimum aggregate counts are only a foundation. No claim of differential privacy or complete protection from inference attacks is made. Do not activate real audience analytics without withdrawal propagation, provenance and disclosure review.
- The optional model sees submitted text/briefs; users must avoid supplying personal identifiers or sensitive customer records. Provider retention is governed by the selected provider.
- Public cultural search text is user supplied. The UI asks for cultural references; it does not automatically redact arbitrary identifiers typed into that field.

Automated negative coverage includes cross-tenant read/update attempts, invalid session tokens, cross-origin writes, consent revocation/expiry, malformed entity responses and insufficient aggregates. A passing fixture test is not a penetration test or a live Qloo validation.
