# Skill: Build

## Purpose

Compile and build all packages and applications in the workspace using Turborepo. Turborepo handles the task graph, caching, and parallel execution automatically.

## Commands

### Build everything

```bash
pnpm run build
```

Builds all packages and templates via Turborepo. Cached builds are replayed when source hasn't changed.

### Build a specific template

```bash
pnpm run build:template:<name>
```

Available targets:

- `pnpm run build:template:api-server`
- `pnpm run build:template:client-server`
- `pnpm run build:template:client-server-database`
- `pnpm run build:template:landing-page`

### Build a specific package

```bash
pnpm run build:utils
pnpm run build:database
```

## Build Pipeline

Defined in `turbo.json`:

- `build` depends on `^build` (dependencies are built first)
- Outputs: `dist/**`, `build/**`
- `client-server-database` runs `prisma generate` before its build

## Notes

- Turborepo caches build outputs. If a source file hasn't changed, the cached result is replayed.
- The `client-server-database` template builds both server (TypeScript) and client (Vite) in parallel.
- Packages (`@workspace/utils`, `@workspace/database`) compile via `tsc` to `dist/`.
