# Security Hardening Progress

## Scope

Fixing all issues from `finance-tracker-security-hardening.md` **except**:

- **(1) Unauthenticated password reset** — deferred; needs proper UX flow
- **(12) Weak password policy** — deferred; will implement with (1)

## Status

| #   | Issue                                      | Status | Notes                                                                                   |
| --- | ------------------------------------------ | ------ | --------------------------------------------------------------------------------------- |
| 2   | Error handler leaks internals              | done   | Returns generic message when `NODE_ENV=production`                                      |
| 3   | No security headers (helmet)               | done   | Added `helmet` middleware                                                               |
| 4   | JWT secret fallback is weak                | done   | Throws on startup if `JWT_SECRET` missing in production                                 |
| 5   | Database credentials in version control    | done   | Root `.gitignore` already covers `.env`; updated `.env.example`                         |
| 6   | No rate limiting                           | done   | `express-rate-limit` on login (5/15min), register (3/hr), reset (3/hr), search (20/min) |
| 7   | No CSRF protection                         | done   | Double-submit cookie pattern (`ft_csrf` cookie + `x-csrf-token` header)                 |
| 8   | No token revocation on logout              | done   | Logout increments `tokenVersion`, invalidating all sessions                             |
| 9   | Username enumeration via search            | done   | Rate-limited via #6 (20/min); already requires auth                                     |
| 10  | No CORS configuration                      | done   | `cors` middleware with `ALLOWED_ORIGINS` env var                                        |
| 11  | Long token expiry with sliding renewal     | done   | Reduced to 24h; removed sliding renewal from `/me`                                      |
| 13  | Loose integer parsing                      | done   | Created `strictParseInt()` using `Number()` + `Number.isInteger()`                      |
| 14  | Password reset doesn't invalidate sessions | done   | `tokenVersion` incremented on password change                                           |

## Deferred

| #   | Issue                          | Reason                                                                       |
| --- | ------------------------------ | ---------------------------------------------------------------------------- |
| 1   | Unauthenticated password reset | Needs proper UX flow (change password while logged in, or email-based reset) |
| 12  | Weak password policy           | Will implement together with (1)                                             |

## Files Changed

### New files

- `src/server/middleware/csrf.ts` — double-submit cookie CSRF protection
- `src/server/middleware/rateLimit.ts` — rate limiters for auth/search endpoints
- `src/server/utils/parseId.ts` — strict integer parsing utility
- `prisma/migrations/20260217191731_add_token_version/` — migration for `tokenVersion` column

### Modified files

- `src/server/index.ts` — added helmet, cors, CSRF middleware
- `src/server/config.ts` — throw on missing JWT_SECRET in prod; token expiry 7d → 24h
- `src/server/middleware/error.ts` — generic error message in production
- `src/server/middleware/auth.ts` — `createRequireAuth` factory with tokenVersion validation
- `src/server/routes/auth.ts` — rate limiters, tokenVersion in JWT, logout invalidation, no sliding renewal
- `src/server/routes/workspace.ts` — `createRequireAuth`, `strictParseInt`
- `src/server/routes/items.ts` — `createRequireAuth`, `strictParseInt`
- `src/server/routes/sharing.ts` — `createRequireAuth`, `strictParseInt`, rate limiter
- `src/server/types.ts` — added `tokenVersion` to `JwtPayload`
- `src/client/composables/useApi.ts` — sends CSRF token header from cookie
- `prisma/schema.prisma` — added `tokenVersion` field to User model
- `.env.example` — added `ALLOWED_ORIGINS` documentation
- `package.json` — added helmet, cors, express-rate-limit, @types/cors
- `src/__tests__/api.spec.ts` — updated tests for CSRF tokens

## Build & Test

- Build: passing
- Finance-tracker tests: all 25 passing (+ 19 cycle tests, 2 client tests)
- Pre-existing failures in `client-server-database` (unrelated app) remain unchanged
