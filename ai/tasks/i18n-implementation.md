# i18n Support (English + Hebrew) for Finance Tracker

## Context

The finance-tracker app has ~110+ hardcoded English strings across 13 Vue files. We need to add multi-language support (EN/HE) with RTL layout switching, persisted to localStorage.

## Approach

Use `vue-i18n` v10 with Composition API. Locale stored in `localStorage` (key: `locale`). RTL handled by toggling `dir` and `lang` attributes on `<html>`.

---

## Steps

### 1. Install vue-i18n

```bash
cd apps/finance-tracker && pnpm add vue-i18n@10
```

### 2. Create locale files

- `src/client/locales/en.json` — all English strings, organized by domain
- `src/client/locales/he.json` — copy of en.json (user fills translations later)

**Key structure:**

```json
{
  "nav": { "appName", "myWorkspace", "shared", "completedCycles", "logout", "toggleMenu" },
  "auth": { "signIn", "username", "password", ... },
  "workspace": { "loading", "retry", "sharedBanner", "cycleComplete", ... },
  "items": { "addItem", "editItem", "day", "editItemTitle", "deleteItemTitle", ... },
  "balance": { "current", "expected", "surplus", "deficit", "update", ... },
  "sharing": { "title", "addMember", "searchPlaceholder", "remove", ... },
  "cycles": { "title", "subtitle", "loading", ... },
  "common": { "cancel", "save", "confirm", "loading" },
  "itemTypes": { "INCOME", "CREDIT_CARD", "LOAN_PAYMENT", "RENT", "OTHER" }
}
```

### 3. Create i18n plugin setup

- `src/client/i18n.ts` — create and export the i18n instance
- Read initial locale from `localStorage.getItem('locale') || 'en'`
- Register EN and HE messages
- Configure `legacy: false` for Composition API mode

### 4. Register plugin in main.ts

- Import and `app.use(i18n)` after pinia and router

### 5. Replace hardcoded strings in all Vue files

Files to modify (in order):

1. **AppHeader.vue** — nav labels, logout, aria-labels
2. **BalanceCards.vue** — balance labels, edit title
3. **EmptyState.vue** — empty state heading/body/button
4. **AddMemberForm.vue** — heading, placeholder, button
5. **MemberList.vue** — remove button, empty message
6. **ItemForm.vue** — form labels, placeholders, buttons
7. **ItemList.vue** — day badge, title attributes
8. **LoginView.vue** — all form strings
9. **RegisterView.vue** — all form strings
10. **ResetPasswordView.vue** — all form strings
11. **WorkspaceView.vue** — loading, modals, banners, buttons
12. **SharedWorkspacesView.vue** — heading, empty state, buttons
13. **CompletedCyclesView.vue** — heading, empty state, labels

Each file: import `useI18n`, destructure `{ t }`, replace template strings with `{{ t('key') }}`.

### 6. Handle ITEM_TYPE_LABELS in types.ts

Move type labels into locale JSON. Components that use `ITEM_TYPE_LABELS[item.type]` will instead use `t('itemTypes.' + item.type)`.

### 7. Add locale switcher to AppHeader

- Small EN/HE toggle button next to the Logout button (right side of header)
- On mobile: also shown in the hamburger menu
- On click: update i18n locale, save to localStorage, update `document.documentElement.dir` and `document.documentElement.lang`

### 8. RTL support in App.vue

- On app mount and locale change: set `document.documentElement.dir` to `rtl` or `ltr`
- Set `document.documentElement.lang` to `he` or `en`

### 9. RTL CSS adjustments

- Add Tailwind v4 RTL utilities in `style.css` where needed
- Key patterns to handle:
  - `ml-auto` → needs `rtl:mr-auto rtl:ml-0` (or use logical properties `ms-auto`)
  - `gap` and `flex` generally work fine in both directions
  - `text-left`/`text-right` → use `text-start`/`text-end`
  - `rounded-t-2xl sm:rounded-xl` (modal) — fine as-is
  - `pl-`/`pr-` → use `ps-`/`pe-` (logical padding)
- Prefer swapping to logical Tailwind utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) where directional classes exist

### 10. Number formatting

- The existing `formatAmount` in ItemList.vue uses hardcoded `en-US`
- Update to use the current locale for `Intl.NumberFormat`

---

## Files Modified

- `apps/finance-tracker/package.json` (add vue-i18n)
- `apps/finance-tracker/src/client/main.ts` (register i18n)
- `apps/finance-tracker/src/client/i18n.ts` (new — i18n setup)
- `apps/finance-tracker/src/client/locales/en.json` (new)
- `apps/finance-tracker/src/client/locales/he.json` (new — copy of en.json)
- `apps/finance-tracker/src/client/style.css` (minimal RTL adjustments if needed)
- `apps/finance-tracker/src/client/App.vue` (dir/lang management)
- `apps/finance-tracker/src/client/components/AppHeader.vue` (i18n + locale switcher)
- All 6 other components + 5 views (i18n string replacement)
- `apps/finance-tracker/src/client/types.ts` (remove ITEM_TYPE_LABELS or keep as fallback)

## Verification

1. `pnpm build` — ensure no build errors
2. `pnpm dev --filter=finance-tracker` — verify EN renders correctly
3. Toggle to HE — verify RTL layout flips, strings show (untranslated keys for now)
4. Refresh page — verify locale persists from localStorage
5. Toggle back to EN — verify LTR restores
