# syntax=docker/dockerfile:1.6

# 1. Base image for dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only the files needed for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN corepack enable pnpm && pnpm install --no-frozen-lockfile

# 2. Builder image
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED 1

# Copy installed dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the source code for the relevant workspace
COPY apps/web ./apps/web

# Build the specific application
RUN corepack enable pnpm && pnpm --filter @open-erm/web build

# 3. Runner image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy built assets from the 'builder' stage
COPY --from=builder /app/apps/web/next.config.mjs ./
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]