FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev
# Regenerate Prisma client for production
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system sveltekit && adduser --system sveltekit --ingroup sveltekit

COPY --from=builder --chown=sveltekit:sveltekit /app/build ./build
COPY --from=builder --chown=sveltekit:sveltekit /app/node_modules ./node_modules
COPY --from=builder --chown=sveltekit:sveltekit /app/prisma ./prisma
COPY --from=builder --chown=sveltekit:sveltekit /app/prisma.config.ts ./prisma.config.ts
COPY --chown=sveltekit:sveltekit package.json .

USER sveltekit
EXPOSE 3000
CMD ["node", "build/index.js"]