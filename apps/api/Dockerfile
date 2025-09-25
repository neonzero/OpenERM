# syntax=docker/dockerfile:1.6
# 1. Base image for dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy lockfile and workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files first to leverage Docker cache
COPY package.json ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 2. Builder image
FROM node:20-alpine AS builder
WORKDIR /app

# Copy installed dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the source code
COPY . .

# Build the specific application
RUN corepack enable pnpm && pnpm --filter @open-erm/api build

# 3. Runner image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and production dependencies from the 'builder' stage
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

CMD ["node", "dist/main.js"]