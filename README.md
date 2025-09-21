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

- **Security**: JWT-based auth with refresh rotation, Nest guards for RBAC, Prisma-backed audit trail,
  and multi-tenant row ownership enforced in the schema.
- **Risk management**: APIs and UI for risk registers, assessments, mitigation tracking, KRI
  monitoring, quarterly questionnaires, and CSV import/export with appetite-aware dashboards.
- **Internal audit**: Engagement planning, audit-universe driven plans, RACM/program management,
  timesheets, findings follow-up, and PDF reporting with immutable evidence trails.
- **Observability**: Pino structured logging, health checks, and event emission scaffolding.
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
