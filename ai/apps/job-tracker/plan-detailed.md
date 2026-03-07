# Job Tracker (ApplyFlow) - Detailed Implementation Plan

## Phase 1: Scaffolding & Foundation

### 1.1 Copy Template

- Copy `templates/client-server-database/` to `apps/job-tracker/`
- Exclude `node_modules/`, `dist/`, `.turbo/`, `src/generated/`

### 1.2 Update Package Identity

- **`package.json`**:
  - Set `"name": "job-tracker"`
  - Set server port to `3011` in scripts
  - Set client dev port to `5181` in vite config
  - Ensure dependencies include: `@workspace/database`, `@workspace/login`, `@workspace/utils`, `pinia`, `vue-router`, `marked`, `dompurify`
  - Add `@types/dompurify` as devDependency
- **`.env`**: Set `DATABASE_URL=postgresql://workspace:workspace_dev@localhost:5432/job_tracker`
- **`vite.config.ts`**: Update proxy target to `http://localhost:3011`, port to `5181`
- **`tsconfig.json`** and sub-configs: Verify paths are correct for new location

### 1.3 Register in Workspace

- Update root `tsconfig.json` references if needed
- Run `pnpm install`
- Verify: `pnpm build --filter=job-tracker`

---

## Phase 2: Database Schema & Prisma

### 2.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ApplicationStatus {
  APPLIED
  IN_PROGRESS
  OFFER
  REJECTED
  GHOSTED
  ARCHIVED
}

model User {
  id             Int           @id @default(autoincrement())
  username       String        @unique
  displayName    String        @map("display_name")
  passwordHash   String        @map("password_hash")
  tokenVersion   Int           @default(0) @map("token_version")
  emailHash      String?       @map("email_hash")
  emailEncrypted String?       @map("email_encrypted")
  applications   Application[]
  createdAt      DateTime      @default(now()) @map("created_at")
}

model Application {
  id          Int               @id @default(autoincrement())
  userId      Int               @map("user_id")
  companyName String            @map("company_name")
  role        String
  status      ApplicationStatus @default(APPLIED)
  salaryRange String?           @map("salary_range")
  jobLink     String?           @map("job_link")
  companyUrl  String?           @map("company_url")
  description String?
  position    Int               @default(0)
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  stages      Stage[]
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  @@index([userId, status])
}

model Stage {
  id            Int         @id @default(autoincrement())
  applicationId Int         @map("application_id")
  label         String
  order         Int         @default(0)
  isCompleted   Boolean     @default(false) @map("is_completed")
  notes         String?
  scheduledAt   DateTime?   @map("scheduled_at")
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@index([applicationId, order])
}
```

### 2.2 Prisma Config (`prisma.config.ts`)

- Follow template pattern, pointing to the correct schema and migration directories

### 2.3 Migration & Seed

- Run `npx prisma migrate dev --name init`
- Create `prisma/seed.ts` with sample user, applications, and stages

---

## Phase 3: Server - Auth & Core API

### 3.1 Auth Repository (`src/server/auth/repository.ts`)

Follow finance-tracker pattern:

```typescript
import type { AuthRepository } from '@workspace/login';
import type { PrismaClient } from '../../generated/prisma/index.js';

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async findUserByUsername(username) {
      /* prisma.user.findUnique */
    },
    async findUserById(id) {
      /* prisma.user.findUnique */
    },
    async createUser(data) {
      return prisma.user.create({
        data: {
          username: data.username,
          displayName: data.displayName,
          passwordHash: data.passwordHash,
          emailHash: data.emailHash,
          emailEncrypted: data.emailEncrypted,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          passwordHash: true,
          tokenVersion: true,
          emailEncrypted: true,
        },
      });
    },
    // incrementTokenVersion, findUserByEmailHash, updatePassword...
  };
}
```

### 3.2 Auth Config (`src/server/auth/config.ts`)

- JWT secret, token expiry, cookie names, CSRF cookie name (`jt_csrf`)
- Follow finance-tracker config pattern

### 3.3 Server Entry (`src/server/index.ts`)

```typescript
import express from 'express';
import { authRouter, userRouter, createCsrfMiddleware, createRequireAuth } from '@workspace/login';
import { createAuthRepository } from './auth/repository.js';
import { authConfig } from './auth/config.js';
import { applicationRouter } from './routes/applications.js';
import { stageRouter } from './routes/stages.js';

// Prisma client setup via @workspace/database
// Middleware: helmet, cors, json, cookieParser, csrf
// Routes:
//   /api/auth -> authRouter (login, register, logout, session)
//   /api/user -> userRouter (password reset, profile)
//   /api/applications -> requireAuth -> applicationRouter
//   /api/stages -> requireAuth -> stageRouter
// SPA fallback for production
```

### 3.4 API Routes

#### `src/server/routes/applications.ts`

All routes require authentication. Applications are scoped to `req.user.id`.

| Method | Path                             | Description                                                        |
| ------ | -------------------------------- | ------------------------------------------------------------------ |
| GET    | `/api/applications`              | List all applications for current user (with stages for next-step) |
| GET    | `/api/applications?search=term`  | Search/filter by company name or role                              |
| POST   | `/api/applications`              | Create application                                                 |
| PUT    | `/api/applications/:id`          | Update application (status, details)                               |
| DELETE | `/api/applications/:id`          | Delete application                                                 |
| PUT    | `/api/applications/:id/position` | Update card position/status (drag-drop)                            |

#### `src/server/routes/stages.ts`

All routes require authentication. Ownership verified via application's `userId`.

| Method | Path                           | Description                                 |
| ------ | ------------------------------ | ------------------------------------------- |
| GET    | `/api/applications/:id/stages` | List stages for an application              |
| POST   | `/api/applications/:id/stages` | Add a stage                                 |
| PUT    | `/api/stages/:id`              | Update stage (label, notes, scheduled date) |
| PUT    | `/api/stages/:id/toggle`       | Toggle stage completion                     |
| PUT    | `/api/stages/reorder`          | Reorder stages (batch update `order` field) |
| DELETE | `/api/stages/:id`              | Delete a stage                              |

### 3.5 Ownership Check Helper

```typescript
async function verifyApplicationOwnership(
  prisma: PrismaClient,
  applicationId: number,
  userId: number
) {
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application || application.userId !== userId) return null;
  return application;
}
```

### 3.6 "Next Step" Logic (Server)

When fetching applications, include stages and compute next step:

```typescript
const applications = await prisma.application.findMany({
  where: { userId: req.user.id },
  include: {
    stages: { orderBy: { order: 'asc' } },
  },
});

// For each application, derive nextStep
const withNextStep = applications.map((app) => {
  const nextStage = app.stages.find((s) => !s.isCompleted);
  return {
    ...app,
    nextStep: nextStage ? nextStage.label : 'Pending Decision',
  };
});
```

---

## Phase 4: Client - Core UI

### 4.1 Project Structure

```
src/client/
  App.vue
  main.ts
  style.css
  router/
    index.ts
  stores/
    auth.ts              # createAuthStore from @workspace/login/client
    applications.ts      # applications CRUD + next-step computation
  composables/
    useApi.ts            # createApiComposable('jt_csrf')
  views/
    BoardView.vue        # Main Kanban board
    SettingsView.vue
  components/
    AppHeader.vue        # Navigation bar
    KanbanColumn.vue     # Single column (Applied, In Progress, etc.)
    ApplicationCard.vue  # Card with company, role, next-step badge
    ApplicationDetail.vue # Slide-over/modal for full application view
    StageManager.vue     # Add/reorder/toggle stages
    StageItem.vue        # Single stage row
    NotesEditor.vue      # Markdown editor + preview
    SearchFilter.vue     # Search/filter bar
```

### 4.2 Router (`src/client/router/index.ts`)

```typescript
// Auth views from @workspace/login/views
// /login, /register, /forgot-password, /reset-password -> requiresAuth: false
// / -> BoardView (requiresAuth: true)
// /settings -> SettingsView (requiresAuth: true)
// beforeEach guard: check auth.isChecked, redirect to login if needed
```

### 4.3 Stores

#### `stores/auth.ts`

```typescript
import { createAuthStore } from '@workspace/login/client';
export const useAuthStore = createAuthStore({ csrfCookieName: 'jt_csrf' });
```

#### `stores/applications.ts`

```typescript
// State: applications[], searchQuery, activeApplicationId
// Getters:
//   - applicationsByStatus (grouped by ApplicationStatus for columns)
//   - filteredApplications (filtered by searchQuery on companyName/role)
//   - activeApplication (currently selected for detail view)
// Actions:
//   - fetchApplications()
//   - createApplication({ companyName, role })
//   - updateApplication(id, data)
//   - deleteApplication(id)
//   - updateApplicationStatus(id, status, position) -- for drag-and-drop
```

### 4.4 Color Scheme & Theming

**Palette**: Dark mode only. Dark blue + white. No purple tones (differentiate from finance-tracker).

| Token                   | Value                 | Usage                          |
| ----------------------- | --------------------- | ------------------------------ |
| `--color-bg`            | `#0f172a` (slate-900) | Page background                |
| `--color-surface`       | `#1e293b` (slate-800) | Cards, panels, columns         |
| `--color-surface-hover` | `#334155` (slate-700) | Hover states                   |
| `--color-border`        | `#334155` (slate-700) | Borders, dividers              |
| `--color-text`          | `#f8fafc` (slate-50)  | Primary text                   |
| `--color-text-muted`    | `#94a3b8` (slate-400) | Secondary text                 |
| `--color-primary`       | `#3b82f6` (blue-500)  | Buttons, links, active states  |
| `--color-primary-hover` | `#2563eb` (blue-600)  | Button hover                   |
| `--color-accent`        | `#60a5fa` (blue-400)  | Badges, highlights             |
| `--color-success`       | `#22c55e` (green-500) | Completed stages, offer column |
| `--color-warning`       | `#f59e0b` (amber-500) | Pending states                 |
| `--color-danger`        | `#ef4444` (red-500)   | Delete, rejected               |

Define these as CSS custom properties in `style.css` on `:root`.

**`@workspace/login` theming**: The login package views (LoginView, RegisterView, etc.) must support per-app color customization. Verify if the package already uses CSS custom properties. If not, refactor the login package to use CSS variables for backgrounds, text, primary/accent colors, and input styling — so each consuming app can override them via its own `:root` definitions. This is a prerequisite before building the job-tracker UI.

### 4.5 Kanban Board (`BoardView.vue`)

- Layout: 4 columns - Applied | In Progress | Offer | Archived/Rejected
- Each column renders `KanbanColumn` with filtered applications
- Drag-and-drop between columns updates `status` via API
- Search/filter bar at top filters cards by company name or role
- "Add Application" button opens a quick-add form (company name + role)

### 4.6 Application Card (`ApplicationCard.vue`)

- Displays: Company Name, Role
- **"Next Step" badge**: Prominent badge showing the first uncompleted stage label
  - Green badge if a next step exists (with `scheduledAt` date if set)
  - Gray "Pending Decision" badge if all stages completed
- Click opens `ApplicationDetail` slide-over

### 4.7 Kanban Column Mapping

| Column            | Statuses                          |
| ----------------- | --------------------------------- |
| Applied           | `APPLIED`                         |
| In Progress       | `IN_PROGRESS`                     |
| Offer             | `OFFER`                           |
| Archived/Rejected | `REJECTED`, `GHOSTED`, `ARCHIVED` |

---

## Phase 5: Application Detail View

### 5.1 ApplicationDetail (Slide-over)

- Slides in from the right, overlaying the Kanban board
- Sections:
  1. **Header**: Company name, role, status dropdown, delete button
  2. **Info**: Job link, company website, salary range, description
  3. **Stage Manager**: The core feature
  4. **Actions**: Archive, mark as offer, mark as rejected/ghosted

### 5.2 Stage Manager (`StageManager.vue`)

- List of stages ordered by `order` field
- Each stage shows: checkbox (toggle completion), label, scheduled date, notes icon
- "Add Stage" input at bottom (quick add with just a label)
- Drag handle for reordering stages
- Click on stage expands to show notes editor

### 5.3 Notes Editor (`NotesEditor.vue`)

- Textarea for Markdown input
- Live preview panel using `marked` library
- Sanitize output with `dompurify` before rendering
- Save on blur or explicit save button

### 5.4 Next Step Computation (Client)

Mirror the server logic for immediate UI feedback:

```typescript
const nextStep = computed(() => {
  const stages = application.stages.sort((a, b) => a.order - b.order);
  const next = stages.find((s) => !s.isCompleted);
  return next ? next.label : 'Pending Decision';
});
```

---

## Phase 6: Testing & Verification

### 6.1 API Tests (`src/__tests__/api.spec.ts`)

- Auth: register, login, logout, session check
- Applications: CRUD operations, status updates, search/filter
- Stages: CRUD, reorder, toggle completion
- Next Step: verify correct computation with various stage states

### 6.2 Component Tests (`src/client/__tests__/`)

- `App.spec.ts`: Basic mount test
- `ApplicationCard.spec.ts`: Next-step badge rendering
- `KanbanColumn.spec.ts`: Correct filtering by status

### 6.3 Verification Checklist

- [ ] `pnpm build --filter=job-tracker` succeeds
- [ ] `pnpm test --filter=job-tracker` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm dev --filter=job-tracker` starts correctly (client on 5181, server on 3011)
- [ ] Register, login, logout flow works
- [ ] Kanban board renders with correct columns
- [ ] Create/edit/delete applications works
- [ ] Stage manager: add, reorder, toggle, notes
- [ ] Next Step badge updates correctly
- [ ] Search/filter works
- [ ] Markdown notes render safely (sanitized)

---

## File Creation Order

Recommended implementation sequence to minimize broken states:

1. Scaffold: copy template, update configs, `pnpm install`
2. Prisma schema + migration + seed
3. `src/server/auth/repository.ts` + `src/server/auth/config.ts`
4. `src/server/index.ts` (server entry)
5. `src/server/routes/applications.ts`
6. `src/server/routes/stages.ts`
7. `src/client/stores/auth.ts` + `src/client/composables/useApi.ts`
8. `src/client/router/index.ts`
9. `src/client/stores/applications.ts`
10. `src/client/App.vue` + `src/client/components/AppHeader.vue`
11. `src/client/views/BoardView.vue` + Kanban components
12. `src/client/components/ApplicationDetail.vue` + StageManager + NotesEditor
13. `src/client/views/SettingsView.vue`
14. `src/client/style.css` (global styles)
15. Tests
16. Final build + lint verification

## Dependencies to Add (beyond template)

### Runtime

- `marked` - markdown rendering
- `dompurify` - HTML sanitization for rendered markdown

### Dev

- `@types/dompurify`
