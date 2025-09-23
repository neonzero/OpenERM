# OpenERM

OpenERM is a multi-tenant Integrated Internal Audit & Enterprise Risk Management (ERM) platform
aligned with COSO ERM (2017) and IIA Standards (2024). This repository provides the Phase 1 MVP
covering core risk management and internal audit workflows alongside infrastructure scaffolding.

## Monorepo structure

- `apps/web` – Next.js (App Router) frontend using React, TypeScript, Tailwind, shadcn/ui patterns,
  TanStack Query, Zod, and React Hook Form.
- `apps/api` – NestJS backend with modular domain boundaries (`auth`, `risk`, `audit`, `common`).
- `packages/prisma` – Prisma schema, migrations, and seed helpers for the multi-tenant data model.
- `packages/tsconfig`, `packages/eslint-config` – Shared tooling configuration.
- `infra/terraform` – Terraform modules to provision cloud infrastructure.

## Key capabilities

- **Security**: Short-lived JWT access tokens with refresh rotation, tenant-scoped data access, and
  append-only event logging for every workflow mutation.
- **Risk management**: REST APIs for creating and searching risks, capturing assessments (with
  matrix bucket derivation and appetite flags), assigning mitigation plans, issuing questionnaires,
  and producing a configurable 5×5 risk heat map.
- **Internal audit**: Endpoints for maintaining the audit universe, building tenant audit plans,
  creating engagements, updating RACM lines, tracking working papers, logging findings, managing
  follow-up evidence, and registering generated reports.
- **Observability**: Structured logging, health checks, and persisted domain events to support audit
  trails and monitoring pipelines.
- **DevOps**: Dockerfiles, docker-compose for local orchestration, Terraform scaffolding, and a CI
  pipeline (GitHub Actions) covering lint, type-check, and test stages.

## Getting started

```sh
pnpm install
pnpm --filter @open-erm/api dev # in one terminal
pnpm --filter @open-erm/web dev # in another terminal
```

For local containerized development:

```sh
docker compose up --build
```

Populate the database with seed data:

```sh
cd packages/prisma
pnpm migrate
yarn seed # or pnpm exec ts-node src/seed.ts
```

Environment variables are documented in `.env.example`. Store secrets securely and enable PostgreSQL
row level security before production use.

## Testing

Run the backend unit tests:

```sh
cd apps/api
pnpm test
```

Frontend linting and type checks:

```sh
cd apps/web
pnpm lint
pnpm typecheck
```

## Next steps

- Integrate OIDC (Auth0/Keycloak) for production-grade identity.
- Connect Temporal/BullMQ workers for workflow automation.
- Extend observability with OpenTelemetry traces and metrics exporters.
- Harden Terraform modules with provider-specific resources.
- Enable workflow automation and SCIM provisioning (Phase 2 roadmap).
