# syntax=docker/dockerfile:1.6

# 1. Base image for dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only the files needed for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN corepack enable pnpm && pnpm install --no-frozen-lockfile

# 2. Builder image
FROM node:20-alpine AS builder
WORKDIR /app

# Copy installed dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the source code for the relevant workspace
COPY apps/api ./apps/api

# Build the specific application
RUN corepack enable pnpm && pnpm --filter @open-erm/api build

# 3. Runner image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and production dependencies
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

CMD ["node", "dist/main.js"]