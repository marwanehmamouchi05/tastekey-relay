# Correction safeguards — October 30, 2026

A live budget correction previously proposed a generic category name as a new taste. Applying the proposal could add that unrelated taste alongside the requested budget. This change adds independent checks at the server and review screen.

The server accepts a proposed taste only when its label matches an explicit positive first-person preference phrase. It withholds incomplete, negated, preservation-only or unsupported taste changes. A budget needs one unambiguous USD amount in its own spending context; uncertain, conflicting, foreign-currency or mismatched amounts are withheld. The explanation directs people to the structured editors when extraction is uncertain.

The review screen applies only checked fields. New tastes start unchecked. Applying a budget alone preserves existing taste IDs and labels. Editing the correction text discards the previous proposal; interpreting again resets the choices.

These conservative English checks deliberately reject some valid wording. They are not a general semantic validator, and cannot guarantee a correct category or interpretation. People must still review the result and can use the explicit taste and budget editors.

## Verification before deployment

- Unit suite: 124 passed, one credential-gated live test skipped. Regression cases cover invented labels, partial-word matches, negation, preservation requests, context mixing, conflicting amounts, decimal/grouped amounts and foreign currencies.
- Browser suite: 29 passed, two provider-gated tests skipped, with no retries. The new review tests use explicitly synthetic responses and verify that budget approval cannot silently add a taste, that adding a taste needs an explicit check, and that editing invalidates an old proposal.
- Production build, TypeScript and changed-file formatting checks passed.
- The live model acceptance test now also checks exact preservation of original taste IDs and labels after a budget-only correction. Production acceptance must be recorded separately after deployment.

## Production findings and follow-up

The first production run on commit 0b3804a completed with 26 passes, two failures and three intentional skips. One failure exposed a synthetic test setup race: seeding local storage after navigation could be overwritten by initial client persistence. The fixture now initializes storage before the app starts. The other was a real provider-contract failure: a model response omitted its explanation, so schema validation safely rejected the correction.

The follow-up supplies neutral review guidance when explanatory display text is absent or null, without supplying any preference, category or amount. All correction fields still pass the independent explicit-statement checks. The model prompt now also specifies a flat response shape. Three new regression cases failed before the change and passed afterward; the complete unit suite passed 127 tests, with one intentional live-provider skip. Fresh production acceptance remains required after deploying this follow-up.

## Evidence boundaries

One owner film-choice check found the first suggestions relevant but already seen; a follow-up candidate looked useful. This is one self-selected owner response, not independent customer validation, observed viewing, recommendation superiority or measured business benefit.

The running host and daily backup service were checked separately. A backup copy passed integrity and rollback-write checks in an isolated container, with the source backup unchanged. This does not establish a current off-host recovery copy or guaranteed uptime. Private infrastructure evidence stays outside the public repository.
