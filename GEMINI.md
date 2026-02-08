# Project Overview

This is an app factory monorepo designed for quickly building, testing, and deploying multiple web applications from shared foundations. It leverages `pnpm` for package management and `Turborepo` for efficient task orchestration across workspaces.

## Structure

The project is structured into three main areas:

- `apps/`: Contains deployable applications, each considered an independent project.
- `packages/`: Houses shared internal libraries, which can be imported by applications as `@workspace/*`. Examples include `@workspace/database` and `@workspace/utils`.
- `templates/`: Provides gold-master starting points for new applications, such as `api-server`, `client-server`, `client-server-database`, and `landing-page`.
- `ai/`: Contains AI agent context such as personas, skills, and documentation.

## Tech Stack

- **Frontend:** Vue 3 + Vite
- **Backend:** Express 5
- **Language:** TypeScript
- **Database:** Prisma (ORM) with PostgreSQL

# Building and Running

This section outlines the primary commands for managing the monorepo.

## Setup

1.  **Enable pnpm:**
    ```sh
    corepack enable pnpm
    ```
2.  **Install Dependencies:**
    ```sh
    pnpm install
    ```

## Development

- **Start all apps in development mode:**
  ```sh
  pnpm dev
  ```
- **Start a specific app in development mode:**
  ```sh
  pnpm dev --filter=<app-name>
  # Example: pnpm dev --filter=landing-page
  ```
  (Replace `<app-name>` with the directory name of the app or template, e.g., `landing-page`, `api-server`, etc.)

## Building

- **Build all projects:**
  ```sh
  pnpm build
  ```
  (Turborepo caches unchanged packages for efficiency.)

## Testing

- **Run all tests:**
  ```sh
  pnpm test
  ```
  (This command uses Vitest to run tests across all configured projects.)
- **Run tests with coverage:**
  ```sh
  pnpm test:coverage
  ```
- **Run tests for a specific project:**
  ```sh
  pnpm test:<project-name>
  # Example: pnpm test:api-server
  ```
  (Refer to `package.json` for available project-specific test commands.)

## Linting and Formatting

- **Lint all files:**
  ```sh
  pnpm lint
  ```
- **Fix linting errors:**
  ```sh
  pnpm lint:fix
  ```
- **Format code with Prettier:**
  ```sh
  pnpm format
  ```
- **Check code formatting:**
  ```sh
  pnpm format:check
  ```

# Development Conventions

- **Code Quality & Style:**
  - **Linting:** ESLint is used to enforce code quality and consistency, with configurations for TypeScript and Vue.js.
  - **Formatting:** Prettier is used for automatic code formatting to maintain a consistent style across the codebase.
- **Testing:**
  - Vitest is the chosen testing framework, configured to support unit and integration tests across the various packages and applications within the monorepo.
- **Monorepo Management:**
  - **Package Manager:** `pnpm` is used for efficient dependency management and workspace handling.
  - **Build System:** `Turborepo` orchestrates tasks, manages build caching, and optimizes development workflows across the monorepo.
- **Git Hooks:**
  - `husky` is utilized to manage Git hooks, ensuring that actions like linting and formatting (`lint-staged`) are performed before commits, maintaining code quality.

# AI Agent Responsibilities

This workspace is designed to be managed and extended by multiple AI agents with specialized roles to optimize development workflows:

- **Claude Code:** Primarily responsible for code writing, feature implementation, and general code generation tasks. While Claude Code may produce documentation as part of its tasks, it will prompt Gemini CLI for alignment.
- **Gemini CLI:** Responsible for the alignment, review, and optimization of all documentation within the workspace, especially within the `ai/` folder. This includes ensuring consistency, clarity, and adherence to established standards across all documentation whenever prompted by other agents or users.
