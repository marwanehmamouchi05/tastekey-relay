# AWS operations

Latest reviewed runtime: `bbb3e095bf080882f1c6e466dd54154c8787ba15`. See the [final audit](FINAL_READINESS_AUDIT.md) for independently inspected image/revision identity, public matching health, database integrity, backup status and environment-presence checks. This release used existing browser SSH, with no firewall or credential change. Availability must continue through November 6, 2026 at 05:45 Morocco time, the official judging end. The owner's expired billing session prevented a fresh credit balance check; older cached estimates are not current funding proof. Historical checkpoints below remain dated evidence, not the latest runtime identity.

Public origin: https://tastekey.52.47.205.18.sslip.io. Dedicated Lightsail host in Paris (`eu-west-3`), Ubuntu 24.04 LTS, 2 GB RAM / 2 vCPU / 60 GB SSD, console plan price $12 USD/month. Usage consumes applicable credits; overages or credit expiry can create charges. Financial account details are intentionally excluded from this repository.

The app uses non-root Node 24, private persistent volume `tastekey-data` at `/app/data`, Docker network `tastekey-network`, and Caddy HTTPS. Port 3000 is internal. A static attached IP provides the current hostname. A custom domain is preferable for longer-term production. Ubuntu security updates and the required kernel reboot were completed.

## Secrets and model access

Qloo and model credentials live in root-owned mode-600 `/opt/tastekey-relay/.env`, transferred through verified-host SSH without command-line secrets. They are not in source, build layers, browser code or logs. The existing development AWS identity was not copied to production or broadened.

The dedicated `tastekey-relay-model` IAM identity can invoke only the EU Nova Micro inference profile and its required underlying model resources, from the app's static IP, through **2026-11-26T09:04:15Z**. It has no console login or general AWS privileges. App configuration also stops model use at that expiry. Rotate/revoke this credential deliberately after judging. Bedrock uses bounded inputs/output tokens and a SQLite-persisted global cap of 40 attempted calls per UTC day. This is an application limit, not an AWS billing hard cap. Qloo's production app allowance is 60 attempted workflows/hour, separate from event quota.

## Deploy and rollback

Use the AWS browser SSH service, or a temporary source-IP-only rule explicitly authorized by the owner. Remove temporary ingress after maintenance. Keep administrative SSH limited to Lightsail browser SSH, with public HTTP/HTTPS only for the app. Use the verified managed host key for command-line access; never disable host-key or TLS verification.

Run `sudo bash scripts/deploy.sh FULL_REVIEWED_COMMIT_SHA` from `/opt/tastekey-relay`. The script makes a consistent predeployment SQLite snapshot, fetches the pinned revision, builds the non-root image and recreates the app with its existing volume. Failed HTTPS health checks restore the previous container. Additive database initialization preserves old records. Do not delete the data volume. Review changes requiring destructive migrations separately.

The completion update initially failed because restrictive source-file permissions made root-owned package files unreadable to the app user. Health checks restored the previous app. Docker COPY now assigns source ownership to `node`; the failed candidate had no public traffic and was removed after diagnosis. See STATUS.md for the verified deployed revision.

## Backups and restoration

`scripts/install-backups.sh` installs a root-only daily systemd service/timer at 03:15 UTC with up to five minutes jitter. It purges expired consent/recovery records, takes a Node SQLite online backup, validates integrity and retains host copies for roughly seven days. Host-local snapshots do not protect against host loss. Keep a private off-host copy separately; never place database files in the repository or public screenshots.

Before restoring, stop the app, preserve the current volume, validate the chosen snapshot and SQLite integrity, then restore the database as UID 1000 in the volume with appropriate permissions. Remove obsolete WAL/SHM sidecars only while SQLite is stopped and after a consistent snapshot is selected. Start the app and verify private records and status. Never restore a backup over an active database. Unit integration tests exercise WAL-consistent backup and restore; a full server reboot previously verified volume persistence.

Monitor credits, expiry, model identity expiry, event quota, transfer, disk, health and backups. No recurring billing monitor or automated resource teardown was requested or created. Preserve judging availability and needed records before decommissioning; remove unneeded instances and detached IPs deliberately. See [Lightsail FAQ](https://aws.amazon.com/lightsail/faq/) for charging rules.

## Previous runtime checkpoint — October 27

Reviewed runtime revision `7d20be94e1bdbbce3bed766bec6229dadc7dae60` is deployed and healthy. Qloo and Bedrock report ready; actual model browser checks passed. Daily backup and off-host snapshot integrity passed. Temporary PC SSH ingress was removed after maintenance; the console confirms Lightsail browser SSH only. The short-lived CloudShell staging copy of the model credential was removed. Private production/local copies remain intentionally available for the approved integration.

## Verified identity service — October 28

An owner-approved dedicated Cognito Lite user pool and no-secret public OAuth client were created in Paris using `scripts/provision-identity.sh`. The pool requires verified email, uses classic hosted login and optionally supports software-token MFA. No users, IAM keys, SMS or SES sender were created. The app uses HTTPS authorization-code PKCE with state, nonce and explicit ID-token signature verification. Only public issuer/client/logout configuration was appended to the root-private production environment; existing Qloo/model secrets were preserved. See [identity](IDENTITY.md) for account boundaries, provider email limits and current pricing references. Corporate federation requires an actual organization's provider configuration.

The identity foundation was pinned to `fab4f0d23a0aea37c204b825662b8f3d7555a7b7`. The latest application runtime is `9ecd1eae3c6c54133bee3f8690f417a1176ec1c6`, which includes the simpler interface and optional extension/widget. All fifteen applicable public checks, including real Qloo/Bedrock, passed. The widget uses the existing app/database and local matching; no additional AWS service, model key or advertising account was provisioned. Private off-host backup integrity and the daily timer/service passed. The remaining disk space was 43 GB. Deployment health and temporary ingress cleanup are recorded in [STATUS](STATUS.md).
