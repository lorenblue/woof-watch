# Woof Watch

Woof Watch is a mobile-first PWA for coordinating dog care across a household, with quick logging, live status, undo support, and stats for pee, poo, and meal events.

## Local Docker Setup

Create a local environment file:

```sh
cp .env.example .env
```

Start PostgreSQL and the app:

```sh
docker compose -f compose.dev.yml up -d --build
```

Apply database migrations, generate the Prisma client, and seed local data:

```sh
npx prisma migrate dev
npx prisma generate
npx prisma db seed
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

```sh
npm install
npm run dev
```

Set `DATABASE_URL` when running outside Docker:

```sh
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/woof_watch?schema=public"
```

## Production Compose

`compose.prod.yml` is a deployment reference for the published Docker image and Traefik. It is not required for local development.

## Checks

```sh
npm run check
npm run lint
npm run build
```
