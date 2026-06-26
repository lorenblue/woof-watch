FROM node:lts-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:lts-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx svelte-kit sync
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:lts-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system sveltekit && adduser --system sveltekit --ingroup sveltekit

COPY --from=builder --chown=sveltekit:sveltekit /app/build ./build
COPY --from=builder --chown=sveltekit:sveltekit /app/node_modules ./node_modules
COPY --from=builder --chown=sveltekit:sveltekit /app/prisma ./prisma
COPY --from=builder --chown=sveltekit:sveltekit /app/config ./config
COPY --from=builder --chown=sveltekit:sveltekit /app/prisma.config.ts ./prisma.config.ts
COPY --chown=sveltekit:sveltekit package.json .

USER sveltekit
EXPOSE 3000
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node build/index.js"]
