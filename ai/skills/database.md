# Skill: Database Management

## Purpose

Manage PostgreSQL databases and Prisma schemas for applications that use the `@workspace/database` package.

## Prerequisites

### Start PostgreSQL (Docker)

```bash
docker run -d --name workspace-postgres \
  -e POSTGRES_USER=workspace \
  -e POSTGRES_PASSWORD=workspace_dev \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

### Verify connection

```bash
docker exec workspace-postgres pg_isready -U workspace
```

### Create a database for an app

```bash
docker exec workspace-postgres psql -U workspace -d postgres -c "CREATE DATABASE <app_db_name>;"
```

Database naming convention: Convert hyphens to underscores, append `_db`. Example: `client-server-database` → `client_server_database_db`.

## Prisma Commands

All Prisma commands are run from within the app/template directory that owns the schema.

### Generate Prisma client (after schema changes)

```bash
cd templates/client-server-database && npx prisma generate
```

### Push schema to database (development, no migration history)

```bash
cd templates/client-server-database && npx prisma db push
```

### Create and apply migrations (production-ready)

```bash
cd templates/client-server-database && npx prisma migrate dev --name <migration-name>
```

### Seed the database

```bash
cd templates/client-server-database && npx tsx prisma/seed.ts
```

### Open Prisma Studio (visual database browser)

```bash
cd templates/client-server-database && npx prisma studio
```

## Architecture

- **`@workspace/database`** (`packages/database/`): Shared package providing connection management, PrismaClient factory, health checks.
  - `.env` holds the base connection string (host/port/user/password, no database name).
- **Each app/template**: Owns its `prisma/schema.prisma`, migrations, and database name.
  - `.env` holds the full `DATABASE_URL` including database name.

## Environment Variables

| Variable              | Location                 | Example                                                                         |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `DATABASE_URL` (base) | `packages/database/.env` | `postgresql://workspace:workspace_dev@localhost:5432`                           |
| `DATABASE_URL` (full) | `templates/<app>/.env`   | `postgresql://workspace:workspace_dev@localhost:5432/client_server_database_db` |

## Docker Management

```bash
docker start workspace-postgres   # Start existing container
docker stop workspace-postgres    # Stop container
docker rm workspace-postgres      # Remove container
docker logs workspace-postgres    # View logs
```
