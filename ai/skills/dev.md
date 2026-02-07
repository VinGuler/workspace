# Skill: Dev (Local Development)

## Purpose

Launch applications and templates in development mode with hot-reloading for rapid local development.

## Commands

### Run all projects in dev mode

```bash
pnpm run dev
```

Starts all projects via Turborepo in parallel (persistent, no caching).

### Run all templates

```bash
pnpm run dev:templates
```

### Run a specific template

```bash
pnpm run dev:template:<name>
```

Available targets:

- `pnpm run dev:template:api-server` — Express server on port 3001
- `pnpm run dev:template:client-server` — Server (3002) + Vite client (5173)
- `pnpm run dev:template:client-server-database` — Server (3003) + Vite client (5174) + PostgreSQL
- `pnpm run dev:template:landing-page` — Vite client (5173)

## How It Works

- **Server apps**: Use `tsx watch` for hot-reloading TypeScript directly (no compile step).
- **Client apps**: Use Vite dev server with HMR (Hot Module Replacement).
- **Full-stack apps**: Use `npm-run-all2` (`run-p`) to run server and client in parallel.
- **API proxy**: Vite proxies `/api` requests to the Express server (configured in `vite.config.ts`).

## Prerequisites

- For `client-server-database`: A running PostgreSQL instance is required (see `ai/skills/database.md`).
- Run `pnpm install` if dependencies haven't been installed.
- For database templates: Run `prisma db push` or `prisma migrate dev` to ensure the schema is applied.

## Notes

- The `dev` task in `turbo.json` has `"cache": false` and `"persistent": true` since dev servers are long-running.
- Production environment variables can be loaded locally using Railway CLI: `railway run pnpm dev:template:<name>`.
