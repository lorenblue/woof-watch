#!/bin/sh
set -eu

POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-woof-watch-postgres}
BACKUP_ROOT=${BACKUP_ROOT:-/opt/backups/woof-watch}
RCLONE_REMOTE=${RCLONE_REMOTE:-gdrive:woof-watch-backups}
LOCAL_RETENTION_DAYS=${LOCAL_RETENTION_DAYS:-14}
REMOTE_RETENTION_DAYS=${REMOTE_RETENTION_DAYS:-}

if ! command -v docker >/dev/null 2>&1; then
	echo "docker is required" >&2
	exit 1
fi

if ! command -v rclone >/dev/null 2>&1; then
	echo "rclone is required" >&2
	exit 1
fi

umask 077
mkdir -p "$BACKUP_ROOT"

TS=$(date -u +%Y%m%dT%H%M%SZ)
DUMP_FILE="$BACKUP_ROOT/woof-watch-db-$TS.dump"
TMP_DUMP_FILE="$DUMP_FILE.tmp"
CHECKSUM_FILE="$DUMP_FILE.sha256"

cleanup() {
	rm -f "$TMP_DUMP_FILE"
}
trap cleanup EXIT INT TERM

docker exec "$POSTGRES_CONTAINER" sh -lc \
	'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c --no-owner --no-acl' \
	> "$TMP_DUMP_FILE"

mv "$TMP_DUMP_FILE" "$DUMP_FILE"
sha256sum "$DUMP_FILE" > "$CHECKSUM_FILE"

rclone copy "$DUMP_FILE" "$RCLONE_REMOTE"
rclone copy "$CHECKSUM_FILE" "$RCLONE_REMOTE"

find "$BACKUP_ROOT" -type f -name 'woof-watch-db-*.dump' -mtime +"$LOCAL_RETENTION_DAYS" -delete
find "$BACKUP_ROOT" -type f -name 'woof-watch-db-*.dump.sha256' -mtime +"$LOCAL_RETENTION_DAYS" -delete

if [ -n "$REMOTE_RETENTION_DAYS" ]; then
	rclone delete "$RCLONE_REMOTE" --include 'woof-watch-db-*.dump' --include 'woof-watch-db-*.dump.sha256' --min-age "${REMOTE_RETENTION_DAYS}d"
	rclone rmdirs "$RCLONE_REMOTE" --leave-root
fi

echo "Backed up $DUMP_FILE to $RCLONE_REMOTE"
