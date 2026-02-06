# Workspace

An app factory — a monorepo for quickly building, testing, and deploying multiple web apps from shared foundations.

## How It Works

Pick a template, scaffold a new app into `apps/`, and it inherits the full toolchain: TypeScript, linting, testing, CI hooks, and shared packages. Each app is independently deployable.

## Structure

```
apps/          Deployable apps (each is its own project)
packages/      Shared internal libraries (imported as @workspace/*)
templates/     Gold-master starting points for new apps
ai/            AI agent context — personas, skills, docs
```

## Tech Stack

**Frontend:** Vue 3 + Vite | **Backend:** Express 5 | **Language:** TypeScript | **DB:** Prisma + Postgres

## Quick Start

```sh
corepack enable pnpm
pnpm install
pnpm dev            # runs all apps in parallel
pnpm dev --filter=landing-page   # run a single app
```

## Scripts

| Command       | What it does                                           |
| ------------- | ------------------------------------------------------ |
| `pnpm dev`    | Start all apps in dev mode                             |
| `pnpm build`  | Build everything (Turborepo caches unchanged packages) |
| `pnpm test`   | Run all tests                                          |
| `pnpm lint`   | Lint all files                                         |
| `pnpm format` | Format with Prettier                                   |

## Deployment

Apps deploy to Railway from the monorepo root. Each app gets its own subdomain.
