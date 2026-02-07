# AI Skills

This directory is intended to house definitions and documentation for various "skills" that an AI agent can utilize. These skills represent executable scripts or command-line tools designed to automate complex tasks within the `workspace` monorepo.

## Purpose

Skills enable the AI agent to perform sophisticated operations, such as scaffolding new projects, extracting standalone applications, or performing codebase refactorings, by providing structured inputs and expected outputs for these automated processes.

## Key Skills

### Operational

- **[Testing](./testing.md)**: Run unit and integration tests (Vitest) for the full workspace or specific projects.
- **[Build](./build.md)**: Compile all packages and applications via Turborepo with caching.
- **[Lint & Format](./lint-format.md)**: Enforce code quality (ESLint) and formatting (Prettier).
- **[Dev](./dev.md)**: Launch applications in development mode with hot-reloading.
- **[Database](./database.md)**: Manage PostgreSQL instances, Prisma schemas, migrations, and seeding.

### Workflow

- **[Scaffolder](./scaffolder.md)**: Generate new projects in `/apps` from `/templates` blueprints.
- **[Exporter](./exporter.md)**: Flatten an app into a standalone repository for sharing or deployment.

## How to Document a Skill

Each skill should ideally have its own Markdown file detailing:

- **Purpose**: What the skill does and why it's useful.
- **Inputs**: Any parameters, arguments, or configurations the skill requires.
- **Outputs**: What the skill produces (e.g., files, console output, modifications to the codebase).
- **Usage**: Examples of how to invoke the skill.
- **Implementation Details**: (Optional) High-level overview of the underlying script or tool.
