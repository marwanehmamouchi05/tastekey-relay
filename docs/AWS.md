# Proposed AWS deployment

Prepared for a **new dedicated Lightsail instance**, with no changes to other projects.

- Region: Paris (`eu-west-3`), close to Morocco.
- Image: clean Ubuntu 24.04 LTS.
- Plan: dual-stack, 2 GB RAM, 2 vCPU, 60 GB SSD, 3 TB transfer, shown by the console at **$12 USD/month**. Transfer overages and optional resources can cost extra.
- Application: non-root Node 24 container; SQLite in a named persistent volume.
- HTTPS: Caddy and an IP-based `sslip.io` hostname, requiring no domain purchase. The address depends on the instance IP; attach a static IP and update host configuration before relying on stop/start stability. A production custom domain is preferable.
- Secrets: no Qloo/model credentials in instance launch data, source code or build layers. The first deployment honestly reports unavailable intelligence. Add issued credentials through a private server configuration after they arrive.
- Network: expose only HTTP/HTTPS for the application; restrict administrative SSH to the AWS browser SSH service. Port 3000 is internal to Docker.
- Bootstrap: `scripts/lightsail-bootstrap.sh`, designed for a fresh instance, installs Docker, adds 4 GB swap for build memory, clones a reviewed public revision, builds, and starts both containers. Review `/var/log/tastekey-bootstrap.log` and container logs on failures. The script intentionally refuses to overwrite an existing app directory.

The user's billing console was checked read-only: credit applicability includes Lightsail and EC2. Financial account details are intentionally not stored in this public repository. The existing local `nodum-dev` IAM credentials cannot read/provision Lightsail or EC2; they have not been modified or broadened.

Resource creation must be verified in the console. Do not claim a public deployment exists until HTTPS, both product sessions, and server-restart persistence pass. Default Lightsail managed SSH access may require an explicit security-access confirmation before creating the first instance in this region. No paid account upgrade, domain, load balancer, managed database, or snapshot plan is needed for the proposed deployment.

## Redeploy and credential setup

Use the AWS browser SSH console. Keep `/opt/tastekey-relay/.env` private (mode 600), update issued credentials there, build the reviewed source, and recreate the application container with the same `tastekey-data` volume. Never delete that volume during an update. Pin source revisions and retain a backup before schema changes. The current schema uses only additive initialization and requires no migrations.

Monitor credit balance, free-plan end date, transfer use, disk and process health. This app does not schedule resource cleanup or billing monitoring automatically. Stopping an instance does not necessarily remove every charge; consult the actual plan and delete unneeded resources after preserving required records and judging availability.
