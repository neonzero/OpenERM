# Agent Guidelines for OpenERM

## Commands
- **Build**: `pnpm run build`
- **Lint**: `pnpm run lint`
- **Test**: `pnpm run test`
- **Typecheck**: `pnpm run typecheck`
- **Single test (API)**: `cd apps/api && npx jest <test-file>` or `npx jest -t "<test-name>"`
- **Single test (Web)**: `cd apps/web && npx vitest run <test-file>`

## Code Style
- **TypeScript**: Strict mode enabled, target ES2022
- **Imports**: External libraries first, then internal; use `import type` for type-only imports
- **Naming**: PascalCase for classes/components/types, camelCase for variables/methods
- **Formatting**: Prettier with semicolons, single quotes, ES5 trailing commas, 100 char width
- **Linting**: ESLint with rules for consistent type imports, no floating promises, no default exports
- **Error Handling**: Throw exceptions (NestJS style), use proper HTTP status codes
- **React**: Use 'use client' directive, absolute imports with `@/` prefix
- **Backend**: Use dependency injection, Prisma for database, Zod for validation