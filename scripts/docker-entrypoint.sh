#!/bin/sh
set -eu

mkdir -p /app/data
chown -R sveltekit:sveltekit /app/data

exec su-exec sveltekit "$@"
