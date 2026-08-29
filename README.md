# Woof Watch

Woof Watch is a mobile-first PWA for coordinating dog care across a household. It keeps shared pee, poo, and meal logs up to date with fast event entry, live status cards, undo support, and simple activity stats.

## Features

- Track pee, poo, and meal events for multiple dogs
- Show the latest status for each dog at a glance
- Refresh status when the app regains focus or visibility
- Undo recent events and view short event history
- Log retroactive events within a bounded correction window
- Link users with invite codes and session cookies
- Compare household activity on the stats page

## Tech Stack

- SvelteKit and TypeScript
- Prisma ORM with SQLite
- Docker and Docker Compose
- PWA service worker support
- Server-side status and stats aggregation
- Server-side validation and session-based access

## Local Docker Setup

Create a local environment file:

```sh
cp .env.example .env
```

Start the app:

```sh
docker compose -f compose.dev.yml up -d --build
```

The app container applies database migrations on startup. Seed local dogs, actors, and action types:

```sh
docker compose -f compose.dev.yml exec app npx prisma db seed
```

App URL:

```sh
http://localhost:3000
```

Useful Docker commands:

```sh
docker compose -f compose.dev.yml logs -f app
docker compose -f compose.dev.yml down
```

## Development

Install dependencies:

```sh
npm install
```

Set `DATABASE_URL` when running the app directly on your machine:

```sh
DATABASE_URL="file:./data/woof-watch.db"
```

Run the dev server:

```sh
npm run dev
```

Generate Prisma Client after schema changes:

```sh
npx prisma generate
```

## Production Compose

`compose.prod.yml` is a deployment reference for the published Docker image and Traefik. It is not required for local development and should be adapted for the target server, domain, network, and environment values.

## Production Backups

The database can be backed up with SQLite's online backup command and copied to an rclone remote:

```sh
sudo apt install rclone sqlite3
sudo rclone config
sudo /usr/local/bin/woof-watch-backup
```

The script writes timestamped SQLite backups to `/opt/backups/woof-watch`, uploads the backup and checksum to `gdrive:woof-watch-backups`, and removes local backup files older than 14 days. By default, it backs up `/opt/woof-watch/data/woof-watch.db`; set `SQLITE_DB_PATH` if your VM uses a different path.

## PostgreSQL to SQLite Migration

When using Docker Compose, the app container always uses `file:/app/data/woof-watch.db`. The host directory is controlled by `SQLITE_DATA_DIR`, so an old `.env` value like `DATABASE_URL=postgresql://...` cannot accidentally point the SQLite image at Postgres.

For the VM layout used by `compose.prod.yml`, create the host data directory before starting the SQLite-backed app:

```sh
sudo mkdir -p /opt/woof-watch/data
```

The container starts as root only long enough to chown `/app/data`, then runs the app as the `sveltekit` user.

For final production cutover, stop the old app and reminder containers before copying data so no logs can be written to Postgres during the migration. Keep the old `woof-watch-postgres` container running, then run the copy from the SQLite-capable app image:

```sh
sudo mkdir -p /opt/woof-watch/data
docker run --rm \
  --network container:woof-watch-postgres \
  -v /opt/woof-watch/data:/app/data \
  -e DATABASE_URL="file:/app/data/woof-watch.db" \
  -e SQLITE_DATABASE_URL="file:/app/data/woof-watch.db" \
  -e POSTGRES_DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DB?schema=public" \
  ghcr.io/lorenblue/woof-watch:latest \
  sh -c 'node scripts/ensure-sqlite-db.mjs && npx prisma migrate deploy && npm run migrate:postgres-to-sqlite'
```

The migration script refuses to write into a non-empty SQLite database unless `--force` is passed.

For a daily backup on the VM, install the script somewhere stable and add a cron entry:

```sh
sudo install -m 700 scripts/backup-database.sh /usr/local/bin/woof-watch-backup
```

```cron
17 3 * * * /usr/local/bin/woof-watch-backup >> /var/log/woof-watch-backup.log 2>&1
```

The cron entry assumes `sudo rclone config` was used, so the root user has the `gdrive` remote.

## Checks

```sh
npm run check
npm run lint
npm run build
```
