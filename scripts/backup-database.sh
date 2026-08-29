#!/bin/sh
set -eu

BACKUP_DIR=/opt/backups/woof-watch
REMOTE=gdrive:woof-watch-backups
DB_PATH=${SQLITE_DB_PATH:-/opt/woof-watch/data/woof-watch.db}
TS=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$BACKUP_DIR/woof-watch-db-$TS.sqlite"

mkdir -p "$BACKUP_DIR"

if [ ! -s "$DB_PATH" ]; then
	echo "SQLite database not found or empty: $DB_PATH" >&2
	exit 1
fi

TABLE_COUNT=$(sqlite3 -readonly "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('actor', 'dog', 'dog_event', 'action_type', 'session', 'push_subscription', 'reminder_delivery');")
if [ "$TABLE_COUNT" -ne 7 ]; then
	echo "SQLite database at $DB_PATH does not look like Woof Watch" >&2
	exit 1
fi

sqlite3 -readonly "$DB_PATH" ".backup '$FILE'"

if [ "$(sqlite3 -readonly "$FILE" 'PRAGMA integrity_check;')" != "ok" ]; then
	echo "SQLite backup failed integrity check: $FILE" >&2
	exit 1
fi

sha256sum "$FILE" > "$FILE.sha256"

rclone copy "$FILE" "$REMOTE"
rclone copy "$FILE.sha256" "$REMOTE"

find "$BACKUP_DIR" -type f -name 'woof-watch-db-*.sqlite' -mtime +14 -delete
find "$BACKUP_DIR" -type f -name 'woof-watch-db-*.sqlite.sha256' -mtime +14 -delete

echo "Backed up $FILE"
