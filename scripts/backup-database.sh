#!/bin/sh
set -eu

BACKUP_DIR=/opt/backups/woof-watch
REMOTE=gdrive:woof-watch-backups
TS=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$BACKUP_DIR/woof-watch-db-$TS.dump"

mkdir -p "$BACKUP_DIR"

docker exec woof-watch-postgres sh -lc \
	'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c --no-owner --no-acl' \
	> "$FILE"

sha256sum "$FILE" > "$FILE.sha256"

rclone copy "$FILE" "$REMOTE"
rclone copy "$FILE.sha256" "$REMOTE"

find "$BACKUP_DIR" -type f -name 'woof-watch-db-*.dump' -mtime +14 -delete
find "$BACKUP_DIR" -type f -name 'woof-watch-db-*.dump.sha256' -mtime +14 -delete

echo "Backed up $FILE"
