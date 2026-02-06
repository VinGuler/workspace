# Template: Client + Server + Database

The complete factory unit. Express 5 backend, vanilla TypeScript frontend, and a database connection. Use this for apps that need persistent storage.

**Tier 3** — full-stack with database.

## Stack

Express 5 + vanilla TypeScript client + Prisma + Postgres + tsx (dev hot-reload)

## Usage

```sh
pnpm dev        # builds client, starts server at localhost:3000 (auto-restarts)
pnpm build      # compile both client and server
pnpm start      # run production build
pnpm test       # run tests
```

## Notes

- Prisma schema lives in this app's folder (not centralized)
- Requires a Postgres connection string in the environment
