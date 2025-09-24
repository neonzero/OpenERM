# OpenERM Project Context

## Project Overview

OpenERM is a multi-tenant Integrated Internal Audit & Enterprise Risk Management (ERM) platform aligned with COSO ERM (2017) and IIA Standards (2024). This is a monorepo project containing the Phase 1 MVP covering core risk management and internal audit workflows.

### Architecture and Technologies

The system is built as a monorepo with the following structure:
- **`apps/web`** – Next.js (App Router) frontend using React, TypeScript, Tailwind, shadcn/ui patterns, TanStack Query, Zod, and React Hook Form.
- **`apps/api`** – NestJS backend with modular domain boundaries (`auth`, `risk`, `audit`, `dashboard`, `common`, `events`, `queues`, `taxonomy`).
- **`packages/prisma`** – Prisma schema, migrations, and seed helpers for the multi-tenant data model.
- **`packages/tsconfig`, `packages/eslint-config`** – Shared tooling configuration.
- **`infra/terraform`** – Terraform modules to provision cloud infrastructure.

### Key Features

- **Security**: Short-lived JWT access tokens with refresh rotation, tenant-scoped data access, and append-only event logging for every workflow mutation.
- **Risk management**: REST APIs for creating and searching risks, capturing assessments (with matrix bucket derivation and appetite flags), assigning mitigation plans, issuing questionnaires, and producing a configurable 5×5 risk heat map.
- **Internal audit**: Endpoints for maintaining the audit universe, building tenant audit plans, creating engagements, updating RACM lines, tracking working papers, logging findings, managing follow-up evidence, and registering generated reports.
- **Observability**: Structured logging, health checks, and persisted domain events to support audit trails and monitoring pipelines.
- **DevOps**: Dockerfiles, docker-compose for local orchestration, and CI pipeline.

## Building and Running

### Local Development

**Prerequisites:**
- Node.js (with pnpm package manager)
- Docker and Docker Compose for containerized development

**To run the project locally:**

1. Install dependencies:
   ```sh
   pnpm install
   ```

2. Run the API server in one terminal:
   ```sh
   pnpm --filter @open-erm/api dev
   ```

3. Run the web server in another terminal:
   ```sh
   pnpm --filter @open-erm/web dev
   ```

### Containerized Development

To run the project using Docker Compose:
```sh
docker compose up --build
```

### Database Setup

To populate the database with seed data:
```sh
cd packages/prisma
pnpm migrate
pnpm exec ts-node src/seed.ts
```

Environment variables are documented in `.env.example`. Make sure to properly configure them before running.

### Testing

- Run backend unit tests:
  ```sh
  cd apps/api
  pnpm test
  ```

- Run frontend linting:
  ```sh
  cd apps/web
  pnpm lint
  ```

- Run frontend type checking:
  ```sh
  cd apps/web
  pnpm typecheck
  ```

### Other Commands

- Run tests for all packages:
  ```sh
  pnpm test
  ```

- Run linting for all packages:
  ```sh
  pnpm lint
  ```

- Run type checking for all packages:
  ```sh
  pnpm typecheck
  ```

- Build all packages:
  ```sh
  pnpm build
  ```

## Development Conventions

### Code Structure

The backend follows a modular architecture with domain-driven design principles:
- Each domain (risk, audit, auth, etc.) has its own directory with controllers, services, and other components
- Common utilities are kept in the `common` directory
- Events and audit trails are handled in dedicated modules
- Configuration is managed through NestJS config module

### Frontend Architecture

The frontend uses:
- Next.js App Router for routing
- Tailwind CSS for styling
- shadcn/ui components for UI components
- TanStack Query for server state management
- React Hook Form and Zod for form handling and validation
- TypeScript for type safety

### TypeScript Configuration

Shared TypeScript configurations are available in `packages/tsconfig` with different profiles (base, next, node).

## Key Configuration Files

- `pnpm-workspace.yaml`: Defines workspace packages
- `tsconfig.json`: Root TypeScript configuration
- `docker-compose.yml`: Container orchestration configuration
- `eslint.config.js`: ESLint configuration
- `prettier.config.js`: Code formatting configuration

## Project Roadmap

According to the README, next steps include:
- Integrate OIDC (Auth0/Keycloak) for production-grade identity
- Connect Temporal/BullMQ workers for workflow automation
- Extend observability with OpenTelemetry traces and metrics exporters
- Harden Terraform modules with provider-specific resources
- Enable workflow automation and SCIM provisioning (Phase 2 roadmap)

## Common Issues and Solutions

- **Missing dependencies**: Use `pnpm install` to install all dependencies after pulling changes
- **Docker builds failing**: Ensure the pnpm-lock.yaml file exists and that Docker context includes necessary workspace files
- **TypeScript errors**: Run `pnpm typecheck` to identify and fix type issues
- **Module resolution errors**: Check that all Radix UI and other component dependencies are properly installed