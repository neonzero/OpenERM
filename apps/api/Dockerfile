# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY . .
RUN corepack enable pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @open-erm/prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app .
RUN corepack enable pnpm && pnpm --filter @open-erm/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
CMD ["node", "dist/main.js"]