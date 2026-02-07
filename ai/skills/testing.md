# Skill: Testing

## Purpose

Run unit and integration tests across the workspace using Vitest. Tests can be run for the entire workspace or scoped to a specific project.

## Commands

### Run all tests

```bash
pnpm run test
```

Runs all tests across every project registered in `vitest.config.ts` (root workspace config).

### Run tests for a specific project

```bash
pnpm run test:<project-name>
```

Available project targets:

- `pnpm run test:api-server`
- `pnpm run test:landing-page`
- `pnpm run test:client-server`
- `pnpm run test:client-server-database`
- `pnpm run test:database`

### Run tests with coverage

```bash
pnpm run test:coverage
```

Generates a coverage report using `@vitest/coverage-v8`.

### Run tests in a specific package directly

```bash
cd packages/database && npx vitest run
cd templates/client-server-database && npx vitest run
```

## Framework

- **Vitest** for all unit and integration tests
- **Supertest** for API endpoint testing (Express apps)
- **Vue Test Utils** + **jsdom** for Vue component tests

## Configuration

- Root workspace config: `vitest.config.ts` (defines all projects)
- Per-project configs: `<project>/vitest.config.ts`

## Notes

- Tests for database-dependent projects require a running PostgreSQL instance (see `ai/skills/database.md`).
- The `test` task in `turbo.json` depends on `^build`, meaning dependencies are built before tests run.
- Tests are also run as part of the pre-push hook via Husky.
