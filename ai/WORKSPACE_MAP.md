# WORKSPACE_MAP.md

## Current State of the Monorepo

This document provides a live overview of the `workspace` monorepo's applications, packages, and templates, reflecting their current status and key characteristics.

### Applications (`apps/`)

- Currently empty. New applications are scaffolded from templates into this directory.

### Templates (`templates/`)

| Template                 | Type            | Stack                               | Status                   |
| :----------------------- | :-------------- | :---------------------------------- | :----------------------- |
| `landing-page`           | Client only     | Vue 3 + Vite + Pinia + Vue Router   | Builds, 1 test passing   |
| `api-server`             | Server only     | Express v5 + tsx (minimal UI)       | Builds, 3 tests passing  |
| `client-server`          | Client + Server | Express v5 + vanilla TS client      | Builds, 14 tests passing |
| `client-server-database` | Full Stack + DB | Client + Server + Prisma + Postgres | Builds, 16 tests passing |

### Packages (`packages/`)

| Package    | Name                  | Purpose                                                       |
| :--------- | :-------------------- | :------------------------------------------------------------ |
| `utils`    | `@workspace/utils`    | Shared utility functions (e.g., `log`).                       |
| `database` | `@workspace/database` | Shared Prisma client and base database connection management. |
