# RTL Support Implementation for Job Tracker

## Context

The `job-tracker` application now supports Hebrew, but the layout is not fully RTL-ready. While Tailwind v4 handles many aspects automatically through flex/grid, some explicit directional classes (like `left-3`, `pl-10`, `border-l-`, `ml-auto`) exist that need to be replaced with logical properties (like `start-3`, `ps-10`, `border-is-`, `ms-auto`) to ensure a proper visual experience in both LTR and RTL.

## Approach

1.  **Logical Properties**: Audit the codebase for explicit directional CSS classes and replace them with their logical equivalents built into Tailwind v4.
2.  **Slide-over Panels**: Ensure slide-over panels (like `ApplicationDetail.vue`) flip correctly (appear from the left in RTL, right in LTR).
3.  **Search Input**: Fix the icon position in the search input for RTL.

---

## Steps

### 1. Replace Directional Classes with Logical Ones

Files to audit:

- **SearchFilter.vue**:
  - `left-3` → `start-3`
  - `pl-10` → `ps-10`
  - `pr-4` → `pe-4`
- **ApplicationDetail.vue**:
  - `border-l` → `border-is`
  - `ml-auto` → `ms-auto`
- **KanbanColumn.vue**:
  - `ml-auto` → `ms-auto`

### 2. General Audit

Search for any remaining directional patterns and replace:

- `ml-` → `ms-`
- `mr-` → `me-`
- `pl-` → `ps-`
- `pr-` → `pe-`
- `left-` → `start-` (except for absolute positioning that shouldn't flip)
- `right-` → `end-` (except for absolute positioning that shouldn't flip)
- `text-left` → `text-start`
- `text-right` → `text-end`
- `border-l` → `border-is`
- `border-r` → `border-ie`

### 3. Move Hardcoded Status Strings to i18n

`ApplicationDetail.vue` has hardcoded strings for application statuses and buttons:

- "Edit Details" → `t('application.editDetails')`
- "Applied", "In Progress", etc. in the `statuses` array.

Update `en.json` and `he.json` accordingly.

### 4. Verification

1.  Toggle to Hebrew.
2.  Verify the slide-over panel border is on the correct side (inner side).
3.  Verify the search icon is on the correct side (start) and padding is adjusted.
4.  Verify that general layout (columns, headers) flips correctly.
