# Website

A full-stack web application monorepo with a Vue.js frontend and Express.js backend.

## Structure

```
website/
├── client/     # Vue.js SPA (Vite)
├── server/     # Express.js API server
└── package.json
```

## Getting Started

```sh
npm install
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in development mode |
| `npm run dev:client` | Start only the Vue.js dev server (port 5173) |
| `npm run dev:server` | Start only the Express server with hot-reload (port 3000) |
| `npm run build` | Build both client and server for production |
| `npm run test` | Run tests across all workspaces |
| `npm run lint` | Lint all files with ESLint |
| `npm run lint:fix` | Lint and auto-fix issues |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing |

## Development

Run both client and server concurrently:

```sh
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3000`

## Production Build

Build and run the production server:

```sh
npm run build
npm run start -w server
```

The server serves the Vue.js client at `http://localhost:3000`.
