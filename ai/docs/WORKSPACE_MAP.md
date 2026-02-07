# Workspace Map

This document provides a comprehensive map of all applications and packages within "The Workspace" monorepo, detailing their location, type, and current status. This helps in understanding the overall structure and the relationships between different components.

## Root Layout

- `/ai`: AI Engine Command Center (documentation, personas, skills for agents)
- `/apps`: Deployable application projects (scaffolded from templates)
- `/packages`: Internal shared libraries and reusable components
- `/templates`: "Gold Master" templates for rapid project scaffolding

## Applications (`/apps`)

Currently, the `/apps` directory is empty, serving as a target for scaffolded projects. New applications will be listed here as they are created.

## Templates (`/templates`)

These are the "Gold Master" blueprints used to create new applications.

| Template                 | Type            | Stack                               | Status                   |
| :----------------------- | :-------------- | :---------------------------------- | :----------------------- |
| `landing-page`           | Client only     | Vue 3 + Vite + Pinia + Vue Router   | Builds, 1 test passing   |
| `api-server`             | Server only     | Express v5 + tsx (minimal UI)       | Builds, 3 tests passing  |
| `client-server`          | Client + Server | Express v5 + vanilla TS client      | Builds, 14 tests passing |
| `client-server-database` | Full Stack + DB | Client + Server + Prisma + Postgres | Builds, 16 tests passing |

## Packages (`/packages`)

These are internal shared libraries consumed by applications and other packages.

| Package    | Name                  | Purpose                                 | Status                            |
| :--------- | :-------------------- | :-------------------------------------- | :-------------------------------- |
| `utils`    | `@workspace/utils`    | Shared utility functions (e.g., log)    | Stable, in use                    |
| `database` | `@workspace/database` | Shared Prisma client and base DB config | Stable, in use (11 tests passing) |

## Future Additions

- As new applications are scaffolded into `/apps`, they should be added to this map.
- New shared packages will also be documented here.
