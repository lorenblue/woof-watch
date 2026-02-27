# Woof Watch

## Database

This project now uses PostgreSQL via Prisma.

Start PostgreSQL locally with Docker:

```sh
docker compose up -d
```

1. Set `DATABASE_URL` (example):

```sh
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/woof_watch?schema=public"
```

2. Apply the baseline migration:

```sh
npx prisma migrate dev
```

3. Generate Prisma Client:

```sh
npx prisma generate
```

Useful Docker commands:

```sh
docker compose logs -f postgres
docker compose down
```

4. (Optional) seed app lookup data/dogs/actors:

```sh
curl -X POST http://localhost:5173/api/admin/seed
```

## Development

```sh
npm install
npm run dev
```

## Checks

```sh
npm run check
```
