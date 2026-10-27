#!/usr/bin/env bash
# Root on the dedicated TasteKey host. Additive schema only; retain rollback image and data.
set -euo pipefail
umask 077
revision=${1:?Pass the reviewed full Git commit SHA}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 1
cd /opt/tastekey-relay
test -f .env
install -d -m 700 /var/backups/tastekey
stamp=$(date -u +%Y%m%dT%H%M%SZ)
inside="/app/data/predeploy-${stamp}.db"
docker exec tastekey-app node --input-type=module -e 'import {DatabaseSync,backup} from "node:sqlite"; process.umask(0o077); const db=new DatabaseSync("/app/data/tastekey.db",{readOnly:true,timeout:5000}); await backup(db,process.argv[1]); db.close();' "$inside"
docker cp "tastekey-app:$inside" "/var/backups/tastekey/predeploy-${stamp}.db"
chmod 600 "/var/backups/tastekey/predeploy-${stamp}.db"
docker exec tastekey-app node -e 'require("node:fs").unlinkSync(process.argv[1])' "$inside"
git fetch origin main
git checkout --detach "$revision"
image="tastekey-relay:${revision:0:12}"
docker build -t "$image" .
old_image=$(docker inspect --format '{{.Image}}' tastekey-app)
docker tag "$old_image" tastekey-relay:rollback
if docker inspect tastekey-app-previous >/dev/null 2>&1; then docker rm tastekey-app-previous; fi
docker stop tastekey-app
docker rename tastekey-app tastekey-app-previous
rollback() {
  docker rm -f tastekey-app 2>/dev/null || true
  docker rename tastekey-app-previous tastekey-app
  docker start tastekey-app
  echo 'New version failed health check; previous app restored. Additive database preserved.'
  exit 1
}
docker run -d --name tastekey-app --restart unless-stopped --network tastekey-network --env-file .env -v tastekey-data:/app/data "$image" || rollback
origin=$(sed -n 's/^APP_ORIGIN=//p' .env)
healthy=false
for attempt in $(seq 1 30); do
  if curl --max-time 4 -fsS "$origin/api/status" >/dev/null; then healthy=true; break; fi
  sleep 2
done
if [ "$healthy" != true ]; then rollback; fi
bash scripts/install-backups.sh
printf 'Deployed reviewed revision %s; HTTPS health and first consistent backup passed.\n' "$revision"
