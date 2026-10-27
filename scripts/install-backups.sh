#!/usr/bin/env bash
set -euo pipefail
# Install on the dedicated Ubuntu host. Local snapshots do not survive host loss.
install -d -m 700 /var/backups/tastekey
cat > /usr/local/sbin/tastekey-backup <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
umask 077
exec 9>/var/lock/tastekey-backup.lock
flock -n 9 || exit 0
stamp=$(date -u +%Y%m%dT%H%M%SZ)
inside="/app/data/backup-${stamp}.db"
outside="/var/backups/tastekey/backup-${stamp}.db"
docker exec tastekey-app node /app/scripts/backup.mjs /app/data/tastekey.db "$inside"
docker cp "tastekey-app:$inside" "$outside"
chmod 600 "$outside"
docker exec tastekey-app node -e 'require("node:fs").unlinkSync(process.argv[1])' "$inside"
# Retain seven days; an offline/off-host copy is still required for disaster recovery.
find /var/backups/tastekey -maxdepth 1 -type f -name 'backup-*.db' -mtime +7 -delete
printf 'Backup completed: %s\n' "$outside"
SCRIPT
chmod 700 /usr/local/sbin/tastekey-backup
cat > /etc/systemd/system/tastekey-backup.service <<'SERVICE'
[Unit]
Description=TasteKey SQLite consistent local backup
After=docker.service
Requires=docker.service
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/tastekey-backup
UMask=0077
SERVICE
cat > /etc/systemd/system/tastekey-backup.timer <<'TIMER'
[Unit]
Description=Daily TasteKey backup
[Timer]
OnCalendar=*-*-* 03:15:00 UTC
Persistent=true
RandomizedDelaySec=300
[Install]
WantedBy=timers.target
TIMER
systemctl daemon-reload
systemctl enable --now tastekey-backup.timer
systemctl start tastekey-backup.service
