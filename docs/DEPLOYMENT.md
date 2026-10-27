# Deployment runbook

The application needs Node 24+, an installed Qloo harness, a writable persistent SQLite disk, and public HTTPS. The public hackathon instance is documented in AWS.md. Hosting and model usage consume applicable AWS credits; monitor ongoing costs and credential expiry.

## Container

1. Copy `.env.example` to `.env` at the repository root, set the event-issued key and a public HTTPS `APP_ORIGIN`, and keep the file private. Optional model values enable language understanding and grounded strategy text.
2. Build and start:

```sh
docker compose up --build -d
```

3. Configure a TLS reverse proxy or your container host's HTTPS endpoint for container port 3000. Strip untrusted forwarding headers. `APP_ORIGIN` must exactly match the public origin, including port if present.
4. Mount a persistent volume at `/app/data`, owned by the container's `node` user. Use one replica. Back up the SQLite database consistently using SQLite backup facilities or a stopped-container snapshot, not an arbitrary WAL-era file copy.
5. Set the event's actual quota as an application limit after organizer confirmation. `QLOO_REQUESTS_PER_HOUR` is a conservative application-level attempted-call allowance, not the organizer's quota.
6. Confirm `GET /api/status` reports configured credentials without revealing them, then run a real search and both product workflows in a fresh browser.

The Dockerfile retains source modules and full Node dependencies because the backend invokes the supported CLI. Do not replace it with a static export or remove the harness from the runtime image. Installing a credential in a builder stage would bake it into image layers; pass it only at runtime.

## Judge readiness checklist

- Public HTTPS URL opens without a developer token or login wall.
- A new visitor gets a new private Studio session and cannot access any previous visitor's records.
- Personal: search and select Interstellar, verify an interpretation, add a design preference, set an explicit budget, grant a context and obtain a traceable live result.
- Studio: save a cinema brief with reviewed references, run a real Qloo analysis, compare a city/budget scenario, accept a strategy, create/edit a plan, record a result, rerun and inspect lessons.
- Repeat after browser refresh and server restart to confirm persistence.
- Confirm raw Personal graphs and spending data never appear in Studio requests or Qloo traces.
- Inspect client bundles, repository history and screenshots for credentials.
- Publish actual live evidence and accurate limitations; keep hosting and credential validity active throughout judging.

A temporary tunnel or localhost preview does not satisfy durable submission hosting. Free hosting availability, persistent-disk support, quotas and secret handling must be checked for the selected provider. No free hosting provider is assumed.
