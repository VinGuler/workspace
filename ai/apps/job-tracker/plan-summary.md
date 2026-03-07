# Job Tracker (ApplyFlow) - Plan Summary

## Overview

Scaffold a new `job-tracker` app in `apps/` from the `client-server-database` template, implementing a Kanban-based job application tracker with a "Global vs. Local" two-tier system: a high-level Kanban board for all applications and a per-application Stage Builder for tracking company-specific interview pipelines.

## Phases

### Phase 1: Scaffolding & Foundation

- Copy `client-server-database` template to `apps/job-tracker`
- Update package name, ports (client: 5181, server: 3011), and workspace references
- Run `pnpm install` and verify build

### Phase 2: Database Schema & Prisma

- Define Prisma schema: User, Application, Stage models
- Create and apply migrations
- Implement seed script with sample data

### Phase 3: Server - Auth & Core API

- Implement `AuthRepository` following finance-tracker pattern (integrating `@workspace/login`)
- Set up Express server with CSRF, auth middleware, and SPA fallback
- Build API routes:
  - `/api/auth` & `/api/user` (delegated to `@workspace/login`)
  - `/api/applications` (CRUD with global status management)
  - `/api/applications/:id/stages` (stage CRUD, reorder, completion toggle)

### Phase 4: Client - Core UI

- Set up Vue Router with auth guards (login, register, board, settings)
- Implement Pinia stores (auth, applications)
- Build Kanban board with columns: Applied, In Progress, Offer, Archived/Rejected
- Build Application Cards with company name, role, and "Next Step" badge
- Implement search/filter by company name or role
- **Color scheme**: Dark mode only. Dark blue and white palette (no purple). Modern, clean aesthetic. Ensure `@workspace/login` views support theming via CSS custom properties so each app can define its own palette.

### Phase 5: Client - Application Detail View

- Slide-over/modal component for application details
- Stage Manager: add, reorder (drag-and-drop), complete/uncomplete stages
- Markdown notes editor per stage (with sanitized rendering)
- Fields: job link, salary range, company website, description

### Phase 6: Testing & Verification

- API integration tests (auth, applications CRUD, stages)
- Vue component unit tests
- Build verification: `pnpm build --filter=job-tracker`
- Lint and format pass

## Key Patterns (from finance-tracker reference)

- Auth via `@workspace/login` (createAuthRepository, createRequireAuth, authRouter)
- CSRF via double-submit cookie pattern (`jt_csrf`)
- Pinia stores with `createAuthStore` and `createApiComposable` from `@workspace/login/client`
- Applications belong directly to the authenticated user (no workspace/sharing layer)
