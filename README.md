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
- Prisma ORM with PostgreSQL
- Docker and Docker Compose
- PWA service worker support
- Raw SQL for latest-event/status aggregation
- Server-side validation and session-based access

## Local Docker Setup

Create a local environment file:

```sh
cp .env.example .env
```

Start PostgreSQL and the app:

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
docker compose -f compose.dev.yml logs -f postgres
docker compose -f compose.dev.yml down
```

## Development

Install dependencies:

```sh
npm install
```

Set `DATABASE_URL` when running the app directly on your machine:

```sh
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/woof_watch?schema=public"
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

## Checks

```sh
npm run check
npm run lint
npm run build
```
