#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${ENV_FILE:-"$ROOT_DIR/.env"}

get_env_value() {
	key=$1
	awk -F= -v key="$key" '
		$1 == key {
			sub(/^[^=]*=/, "")
			gsub(/^"|"$/, "")
			print
			exit
		}
	' "$ENV_FILE"
}

SECRET=${REMINDER_RUN_SECRET:-$(get_env_value REMINDER_RUN_SECRET)}
BASE_URL=${APP_BASE_URL:-$(get_env_value APP_BASE_URL)}
BASE_URL=${BASE_URL:-http://127.0.0.1:3000}
QUERY=

if [ "${1:-}" = "--dry-run" ]; then
	QUERY="?dryRun=true"
	shift
fi

if [ $# -gt 0 ]; then
	if [ -n "$QUERY" ]; then
		QUERY="$QUERY&now=$1"
	else
		QUERY="?now=$1"
	fi
fi

if [ -z "$SECRET" ]; then
	echo "REMINDER_RUN_SECRET is missing. Set it in $ENV_FILE." >&2
	exit 1
fi

curl -fsS -X POST -H "Authorization: Bearer $SECRET" "$BASE_URL/api/reminders/run$QUERY"
echo
