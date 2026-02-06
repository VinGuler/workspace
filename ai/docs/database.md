# Database Strategy: Prisma & PostgreSQL

This document outlines the database strategy within the `workspace` monorepo, focusing on the use of PostgreSQL with Prisma as the ORM (Object-Relational Mapper).

## Core Principles

- **Type Safety**: End-to-end type safety from the database to the application layer using Prisma Client's generated types.
- **Consistency**: A shared Prisma client ensures all applications interact with the database in a consistent and standardized manner.
- **Flexibility**: Per-application Prisma schemas allow for tailored database models and migration paths for individual services, preventing monorepo-wide schema conflicts.

## Technology Stack

- **Database**: PostgreSQL
- **ORM**: Prisma (Client, Migrate, Studio)

## Shared Database Package (`@workspace/database`)

A dedicated internal package, `@workspace/database`, is responsible for:

- **Shared Prisma Client**: Providing a pre-configured Prisma Client instance that can be imported and used by various applications.
- **Base Configuration**: Holding any workspace-wide database configuration or utilities.

## Per-Application Prisma Schemas

- **Location**: Each application that requires a database will have its own `schema.prisma` file located within its project directory (e.g., `apps/my-app/prisma/schema.prisma`).
- **Isolation**: This approach ensures that database schema changes and migrations for one application do not inadvertently affect others, promoting greater autonomy for individual services.
- **Migration Management**: Database migrations are managed on a per-application basis using Prisma Migrate. Each application maintains its own migration history.

## Environment Variables

- Database connection strings and other sensitive credentials are managed via environment variables (e.g., `DATABASE_URL`).
- When deploying to Railway, these variables are configured in the Railway dashboard. For local development, `.env` files are used.

## Entity-Relationship Diagrams (ERDs)

- **Updates**: If an application's Prisma schema changes significantly, the relevant database documentation (e.g., this file or an app-specific `database.md` if the schema is complex) should be updated to reflect the new ERD.
- **Tools**: Prisma Studio can be used to visualize the current database schema interactively.
