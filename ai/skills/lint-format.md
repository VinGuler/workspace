# Skill: Lint & Format

## Purpose

Enforce code quality and consistent formatting across the entire workspace using ESLint and Prettier.

## Commands

### Lint all projects

```bash
pnpm run lint
```

Runs ESLint across all packages and templates via Turborepo.

### Lint and auto-fix

```bash
pnpm run lint:fix
```

Runs ESLint with `--fix` flag to auto-correct fixable issues.

### Format all files

```bash
pnpm run format
```

Runs Prettier on the entire workspace.

### Check formatting (no changes)

```bash
pnpm run format:check
```

Checks if all files match Prettier formatting without modifying them. Useful for CI.

## Configuration

- **ESLint**: `eslint.config.js` (root, flat config v9)
  - TypeScript rules via `typescript-eslint`
  - Vue rules via `eslint-plugin-vue`
  - Server-specific globals for Node.js files (configured in `serverApps` array)
  - Prettier override via `eslint-config-prettier`
- **Prettier**: `.prettierrc` (root)
  - Single quotes, semicolons, 100 char width, trailing commas (ES5), LF line endings

## Automation

- **Pre-commit hook** (Husky + lint-staged): Automatically runs Prettier and ESLint on staged files before every commit.
- **Turborepo**: The `lint` task depends on `^build`, ensuring dependencies are compiled before linting.

## Notes

- When adding new server-side packages or templates, add their glob pattern to the `serverApps` array in `eslint.config.js` to enable Node.js globals.
- Current server apps pattern: `['templates/api-server/**/*.ts', 'packages/database/**/*.ts']`
