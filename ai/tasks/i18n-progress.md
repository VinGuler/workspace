# i18n Implementation Progress

## Status: COMPLETE

| #   | Step                                      | Status |
| --- | ----------------------------------------- | ------ |
| 1   | Install vue-i18n                          | done   |
| 2   | Create en.json + he.json locale files     | done   |
| 3   | Create i18n.ts plugin setup               | done   |
| 4   | Register plugin in main.ts                | done   |
| 5   | Replace strings: AppHeader.vue            | done   |
| 6   | Replace strings: BalanceCards.vue         | done   |
| 7   | Replace strings: EmptyState.vue           | done   |
| 8   | Replace strings: AddMemberForm.vue        | done   |
| 9   | Replace strings: MemberList.vue           | done   |
| 10  | Replace strings: ItemForm.vue             | done   |
| 11  | Replace strings: ItemList.vue             | done   |
| 12  | Replace strings: LoginView.vue            | done   |
| 13  | Replace strings: RegisterView.vue         | done   |
| 14  | Replace strings: ResetPasswordView.vue    | done   |
| 15  | Replace strings: WorkspaceView.vue        | done   |
| 16  | Replace strings: SharedWorkspacesView.vue | done   |
| 17  | Replace strings: CompletedCyclesView.vue  | done   |
| 18  | Handle ITEM_TYPE_LABELS in types.ts       | done   |
| 19  | Add locale switcher to AppHeader          | done   |
| 20  | RTL support (App.vue + dir/lang toggle)   | done   |
| 21  | RTL CSS adjustments (logical properties)  | done   |
| 22  | Number formatting (locale-aware)          | done   |
| 23  | Verification: build + dev test            | done   |

## Notes

- he.json is a copy of en.json — user handles translations separately
- Locale persisted in localStorage (key: `locale`), NOT in URL
- Switcher is next to Logout button in header (and in mobile hamburger menu)
- `ITEM_TYPE_LABELS` in types.ts still exported but no longer used by components (they use `t('itemTypes.' + key)`)
- RTL handled via `document.documentElement.dir` and `document.documentElement.lang` in `i18n.ts`
- Directional CSS classes converted to logical properties: `ms-auto`, `me-auto`, `text-start`, `text-end`
- `Intl.NumberFormat` and `toLocaleDateString` updated to use current locale
- Build verified: `pnpm build --filter=finance-tracker` passes with 0 errors
