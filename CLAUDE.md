# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A pnpm + Turborepo monorepo ("app factory") for scaffolding and deploying web applications from shared templates. All code is TypeScript (strict mode, ES Modules). Frontend is Vue 3 (Composition API) + Vite. Backend is Express 5. Database is PostgreSQL + Prisma 7.

## Commands

### Build & Dev

```bash
pnpm install                                    # install all deps
pnpm build                                      # build entire workspace (Turborepo)
pnpm dev                                        # run all apps in parallel
pnpm dev --filter=<package-name>                # run single app/template
pnpm dev:template:client-server-database        # shorthand for specific template
```

### Test

```bash
pnpm test                                       # run all tests (vitest --run)
pnpm test:api-server                            # single project: vitest --run --project api-server
pnpm test:client-server                         # other projects: landing-page, client-server-database, database
pnpm test:coverage                              # coverage report
```

### Lint & Format

```bash
pnpm lint                                       # lint all (via Turborepo)
pnpm lint:fix                                   # auto-fix with eslint
pnpm format                                     # format all with prettier
pnpm format:check                               # check formatting only
```

### Database (per-app Prisma)

```bash
cd templates/client-server-database             # or apps/<app-name>
npx prisma generate                             # generate client from schema
npx prisma db push                              # push schema to dev DB (no migration)
npx prisma migrate dev --name <name>            # create and apply migration
npx prisma studio                               # visual DB browser
```

## Architecture

### Monorepo Layout

- **`/templates/`** — "Gold Master" templates for scaffolding new apps. Four tiers:
  - `landing-page` — client-only Vue 3 + Vite SPA (port 5175)
  - `api-server` — Express 5 backend only (port 3001)
  - `client-server` — Vue 3 + Express, Vite proxies `/api/*` to backend (client 5173, server 3002)
  - `client-server-database` — full-stack + PostgreSQL/Prisma (client 5174, server 3003)
- **`/apps/`** — Deployable apps scaffolded from templates (currently empty)
- **`/packages/`** — Shared internal libraries under `@workspace/*` scope:
  - `@workspace/utils` — shared utilities (log function)
  - `@workspace/database` — Prisma client factory (singleton pattern, multi-DB support)
- **`/ai/`** — AI agent context (optimized for minimal token usage):
  - `AGENT.md` — single entry point with architecture, constraints, coding standards, skills reference, workflow
  - `WORKSPACE_MAP.md` — living status doc of all apps/packages/templates
  - `personas/` — compact persona files for sub-agent specialization

### Key Patterns

- **Turborepo** orchestrates `build`, `dev`, `test`, `lint` with dependency-aware caching (`turbo.json`)
- **Per-app Prisma schemas** — each app owns its `prisma/schema.prisma` and migrations; the shared `@workspace/database` package provides the client factory
- **Vite API proxy** — full-stack templates proxy `/api/*` from the Vite dev server to the Express backend
- **Path aliases** — `@/` maps to `src/` in each project
- **Testing** — root `vitest.config.ts` aggregates all project test configs; Vue components use jsdom environment; API tests use supertest

### Database

- `@workspace/database` exports `createClient()`, `getDatabaseUrl()`, `checkHealth()`, `disconnect()`, `disconnectAll()`
- Base DB URL in `packages/database/.env`; per-app full URL in each app's `.env`
- Connection string format: `postgresql://workspace:workspace_dev@localhost:5432/<db_name>`

## Conventions

- All internal packages scoped `@workspace/*`
- Conventional Commits: `feat:`, `fix:`, `chore:`, etc.
- Comments explain _why_, not _what_
- Prettier: single quotes, semicolons, 100-char width, trailing commas (ES5), LF endings
- ESLint flat config (v9) with TypeScript + Vue plugins
- Git hooks (Husky): pre-commit runs lint-staged (prettier + eslint on staged files); pre-push runs full test suite
- Transitive deps must be explicitly declared (pnpm strict mode)
- Deployment target is Railway (monorepo integration, subdomain routing)

## Scaffolding New Apps

New apps are created from `/templates/` into `/apps/` using the scaffolder workflow (see `ai/AGENT.md` Section 6): copy template files, update package names, register in root tsconfig, run `pnpm install` and verify build.

## Standalone Export

Apps can be flattened into standalone repos using `pnpm deploy` (exporter skill): bundles `@workspace/*` deps, generates clean package.json, fresh git history, and `docker-compose.yml` for local Postgres.

## Role & Collaboration with Gemini

Claude Code is the **code-writing agent** in this repo. Your primary responsibility is implementing features, fixing bugs, writing tests, and making code changes. You may write or update documentation as part of a task, but **Gemini is the documentation alignment agent**.

**After completing a task**, call Gemini to sync all documentation with your changes:

```bash
gemini -p "<prompt describing what you changed and asking Gemini to update ai/ documentation accordingly>"
```

Example:

```bash
gemini -p "I added a new template 'client-server-auth' in templates/ with JWT authentication. Update ai/AGENT.md skills reference, ai/WORKSPACE_MAP.md with the new template, and any other ai/ docs that need to reflect this change."
```

This ensures `ai/AGENT.md`, `ai/WORKSPACE_MAP.md`, and persona files stay in sync without Claude Code needing to maintain them. Gemini owns the `ai/` folder documentation; Claude Code owns the code.
