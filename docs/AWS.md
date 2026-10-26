# AWS deployment

Deployed to a dedicated Lightsail instance after explicit owner approval. Public origin: https://tastekey.52.47.205.18.sslip.io. The application runtime is built from reviewed revision `a24261399710f1ce9de5da73d42596f4f2e01394`.

- Region: Paris (`eu-west-3`), close to Morocco.
- Image: clean Ubuntu 24.04 LTS.
- Plan: dual-stack, 2 GB RAM, 2 vCPU, 60 GB SSD, 3 TB transfer, shown by the console at **$12 USD/month**. Transfer overages and optional resources can cost extra.
- Application: non-root Node 24 container; SQLite in a named persistent volume.
- HTTPS: Caddy and an IP-based `sslip.io` hostname, requiring no domain purchase. Static IP `tastekey-relay-ip` is attached. The address stays stable across stop/start while this IP remains attached. An attached Lightsail static IP has no additional charge; detached idle IPs can incur charges. A production custom domain is preferable.
- Secrets: no Qloo/model credentials in instance launch data, source code or build layers. The issued Qloo credential is configured in a root-owned mode-600 server environment file, transferred over SSH after verifying the host fingerprint. No model provider is configured.
- Network: expose only HTTP/HTTPS for the application; restrict administrative SSH to the AWS browser SSH service. Port 3000 is internal to Docker.
- Bootstrap: `scripts/lightsail-bootstrap.sh`, designed for a fresh instance, installs Docker, adds 4 GB swap for build memory, clones a reviewed public revision, builds, and starts both containers. Review `/var/log/tastekey-bootstrap.log` and container logs on failures. The script intentionally refuses to overwrite an existing app directory.

The user's billing console was checked read-only: credit applicability includes Lightsail and EC2. Financial account details are intentionally not stored in this public repository. The existing local `nodum-dev` IAM credentials cannot read/provision Lightsail or EC2; they have not been modified or broadened.

Resource creation, valid HTTPS, all seven browser/API tests (including the live Qloo integration), and same-session Studio record persistence after a full server reboot were verified. Ubuntu security updates were applied and the required kernel reboot completed. The default managed SSH key was created with owner approval; administrative ingress is restricted to the Lightsail browser SSH service. No paid account upgrade, domain, load balancer, managed database, or snapshot plan is needed for the proposed deployment.

## Redeploy and credential setup

Use the AWS browser SSH console. Keep `/opt/tastekey-relay/.env` private (mode 600), update issued credentials there, build the reviewed source, and recreate the application container with the same `tastekey-data` volume. Never delete that volume during an update. Pin source revisions and retain a backup before schema changes. The current schema uses only additive initialization and requires no migrations.

Monitor credit balance, free-plan end date, transfer use, disk and process health. This app does not schedule resource cleanup or billing monitoring automatically. Stopping an instance does not necessarily remove every charge; consult the actual plan and delete unneeded resources after preserving required records and judging availability.

## Verified deployment checkpoint

The public status endpoint returned HTTP 200 with Qloo ready and the optional model unavailable. The app runs as UID 1000 (`node`); SQLite is mounted at `/app/data` in `tastekey-data`. Both containers restart automatically. All seven public browser/API tests passed in 41.1 seconds using fresh isolated browser sessions; the live integration case took 24.3 seconds. A separate synthetic business and its private session survived a complete server reboot, then that verification workspace was removed. Initial Caddy image download encountered a transient DNS failure during system updates; a clean retry succeeded. HTTPS checks ran with certificate validation enabled. The first persistence probe was made before restart completion; once both containers were ready, persistence and Qloo status passed.

AWS static IP pricing reference: https://aws.amazon.com/lightsail/faq/. If decommissioning, preserve needed business records and release the detached static IP as well as the instance.
