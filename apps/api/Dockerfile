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

# Copy all necessary files from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/apps/web/package.json ./apps/web/package.json
COPY --from=deps /app/packages/tsconfig/package.json ./packages/tsconfig/package.json
COPY --from=deps /app/packages/prisma/package.json ./packages/prisma/package.json
COPY --from=deps /app/packages/eslint-config/package.json ./packages/eslint-config/package.json

# Copy the rest of the source code
COPY . .

# Ensure @nestjs/cli is available for the api package
RUN corepack enable pnpm && cd apps/api && pnpm add @nestjs/cli@^10.3.2

# Build the specific application
RUN pnpm --filter @open-erm/api build

# 3. Runner image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and production dependencies
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Install only production dependencies
RUN corepack enable pnpm && pnpm install --prod --frozen-lockfile

CMD ["node", "dist/main.js"]