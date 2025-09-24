# Project: OpenERM

## Project Overview

OpenERM is a multi-tenant Integrated Internal Audit & Enterprise Risk Management (ERM) platform. It is a monorepo project built with a Next.js frontend and a NestJS backend. The project uses pnpm for package management and is structured with workspaces for the web and api applications, as well as shared packages. The database is managed with Prisma.

**Key Technologies:**

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zod, React Hook Form
*   **Backend:** NestJS, TypeScript, Prisma
*   **Database:** PostgreSQL
*   **Tooling:** pnpm, Docker, Terraform, GitHub Actions

## Building and Running

### Prerequisites

*   pnpm
*   Docker

### Development

1.  **Install dependencies:**
    ```sh
    pnpm install
    ```

2.  **Run the backend (API):**
    ```sh
    pnpm --filter @open-erm/api dev
    ```

3.  **Run the frontend (Web):**
    ```sh
    pnpm --filter @open-erm/web dev
    ```

### Docker

To run the project using Docker:

```sh
docker compose up --build
```

### Database

To populate the database with seed data:

```sh
cd packages/prisma
pnpm migrate
pnpm exec ts-node src/seed.ts
```

## Testing

*   **Run all tests:**
    ```sh
    pnpm test
    ```

*   **Run backend unit tests:**
    ```sh
    cd apps/api
    pnpm test
    ```

*   **Run frontend linting and type checks:**
    ```sh
    cd apps/web
    pnpm lint
    pnpm typecheck
    ```

## Development Conventions

*   The project follows a monorepo structure, with separate packages for the frontend, backend, and shared code.
*   The backend is built with NestJS and is organized into modules by domain (`auth`, `risk`, `audit`, `common`).
*   The frontend is built with Next.js and uses the App Router.
*   The project uses `pnpm` for package management and workspaces.
*   Code is written in TypeScript.
*   The project uses ESLint for linting and Prettier for code formatting.
*   Continuous integration is set up with GitHub Actions to run linting, type-checking, and tests.
