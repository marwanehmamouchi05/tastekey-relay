#!/usr/bin/env bash
# Intended for a new dedicated Ubuntu 24.04 Lightsail instance as root.
# No credential belongs in this launch script or in instance user data.
set -euo pipefail
exec > >(tee -a /var/log/tastekey-bootstrap.log) 2>&1
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io git curl ca-certificates
systemctl enable --now docker
if [ ! -f /swapfile-tastekey ]; then
  fallocate -l 4G /swapfile-tastekey
  chmod 600 /swapfile-tastekey
  mkswap /swapfile-tastekey
  swapon /swapfile-tastekey
  printf '/swapfile-tastekey none swap sw 0 0\n' >> /etc/fstab
fi
if [ -e /opt/tastekey-relay ]; then
  echo 'Dedicated application directory already exists; refusing to overwrite.'
  exit 1
fi
git clone https://github.com/marwanehmamouchi05/tastekey-relay.git /opt/tastekey-relay
cd /opt/tastekey-relay
# Pin a reviewed revision by setting TASTEKEY_REVISION in the launch wrapper.
if [ -n "${TASTEKEY_REVISION:-}" ]; then git checkout --detach "$TASTEKEY_REVISION"; fi
metadata_token=$(curl -fsS -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' http://169.254.169.254/latest/api/token)
public_ip=$(curl -fsS -H "X-aws-ec2-metadata-token: $metadata_token" http://169.254.169.254/latest/meta-data/public-ipv4)
unset metadata_token
if [[ ! "$public_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo 'No public IPv4 available.'; exit 1; fi
public_host="tastekey.${public_ip}.sslip.io"
install -m 600 /dev/null /opt/tastekey-relay/.env
printf 'APP_ORIGIN=https://%s\nTASTEKEY_DB_PATH=/app/data/tastekey.db\nQLOO_REQUESTS_PER_HOUR=60\n' "$public_host" > .env
docker build -t tastekey-relay:local .
docker network create tastekey-network
docker volume create tastekey-data
docker volume create tastekey-caddy-data
docker volume create tastekey-caddy-config
docker run -d --name tastekey-app --restart unless-stopped --network tastekey-network --env-file .env -v tastekey-data:/app/data tastekey-relay:local
printf '%s {\n  reverse_proxy tastekey-app:3000\n}\n' "$public_host" > /opt/tastekey-Caddyfile
docker run -d --name tastekey-proxy --restart unless-stopped --network tastekey-network -p 80:80 -p 443:443 -v /opt/tastekey-Caddyfile:/etc/caddy/Caddyfile:ro -v tastekey-caddy-data:/data -v tastekey-caddy-config:/config caddy:2-alpine
printf 'TasteKey public URL: https://%s\nOpen Lightsail inbound TCP ports 80 and 443. Restrict SSH to the browser SSH service.\nQloo remains unavailable until its credential is privately configured.\n' "$public_host"
