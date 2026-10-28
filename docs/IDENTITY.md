# Identity and collaboration

The October 28 release adds verified-email OpenID Connect accounts using a dedicated AWS Cognito Lite pool in Paris. `scripts/provision-identity.sh` creates a pool, public authorization-code client and classic hosted login; it creates no users or IAM keys. Its one-time execution was approved by the account owner. Re-running stops if a matching pool exists.

## Sign-in and workspaces

Open `/account`, choose secure sign-in and use the provider's sign-up or sign-in flow. A new account must verify its email before TasteKey accepts it. Passwords and verification codes go directly to Cognito; TasteKey does not handle or store them. Forgotten-password recovery is handled by the provider. Provider emails use the low-volume Cognito default email service; production volume needs a separately authorized SES setup.

First sign-in claims this browser's private Studio workspace, preserving records and revoking prior anonymous session/recovery capabilities. Returning accounts reopen their selected workspace; new private drafts are preserved as another owned workspace. Personal taste graphs remain local to the browser. Shared-device users should sign out. Provider logout is configured on the deployment.

In Studio → Team, owners/admins can rename the workspace and create seven-day invitations bound to an email address. Share links manually; TasteKey does not send invitation emails. Invitations are stored hashed, single-use and revocable. An authenticated account with the exact verified email must accept. An invitation never silently changes an existing member's role.

| Role   | Access                                                                         |
| ------ | ------------------------------------------------------------------------------ |
| Owner  | Business operations, all team roles, ownership transfer and workspace deletion |
| Admin  | Business operations, editor/viewer invitations and membership management       |
| Editor | Business profiles, analyses, decisions, plans, outcomes and reviews            |
| Viewer | Read and export workspace data                                                 |

Administrators cannot manage other administrators or owners. Nobody can remove or demote the owner through the member endpoint; ownership transfer requires another existing member. Membership is checked on every authenticated request, so removal applies to existing sessions immediately. Access changes are recorded in the workspace audit. Account deletion and enterprise directory provisioning are not included; workspace deletion removes its records, memberships, invites, audit and active workspace sessions.

## Authentication controls

OpenID Connect uses HTTPS discovery, PKCE S256, a browser-bound ten-minute server transaction, state, nonce, explicit signature verification and issuer/audience/expiry checks. Transactions are consumed once. Provider tokens are not persisted. TasteKey stores the issuer/subject identity, verified email, memberships and hashed random app session tokens. Accounts are never automatically linked solely because two issuers/subjects share an email address. App sessions last at most eight hours. Mutations require the configured same-origin Origin header. Claimed workspaces disable anonymous capability recovery.

This is a shared account sign-in foundation, not a claim that corporate SAML/enterprise OIDC federation, SCIM, business-registration verification or unique-human verification has been configured. Additional identity providers require an explicitly authorized provider configuration and separate verification.

## Audience consent

Only verified accounts can contribute. A stable private account-derived participant identifier deduplicates contributions across browser sessions; email and identifier are excluded from aggregate reports. Anonymous legacy contributions do not count. Team members cannot contribute to their own business's audience. Categories are explicitly selected, expire after thirty days and can be withdrawn. Reports disclose a group only with at least ten accounts and a complement of zero or at least ten. This does not prove ten independent people and is not differential privacy.

## Cost and evidence

AWS Cognito Lite currently includes an account-wide free allowance for direct/social sign-in; enterprise federation has a separate smaller allowance. Applicable charges/credits depend on the AWS account and service terms. No new paid tier, SES sender or SMS service was enabled. Check [official pricing](https://aws.amazon.com/cognito/pricing/) before increasing volume.

Database authorization tests, mocked protocol wiring tests and real RSA-signed token validation tests cover different boundaries. Local browser account fixtures are explicitly synthetic and never expose a production bypass endpoint. A real newly registered account's password/email-code steps must be completed by its owner before that live round trip can be claimed verified.
