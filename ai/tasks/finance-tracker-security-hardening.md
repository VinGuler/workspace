# Security Hardening — Finance Tracker (Remaining)

Items #2–11, #13–14 have been resolved. Only the following remain:

---

### 1. Unauthenticated password reset

- **File:** `src/server/routes/auth.ts` — `POST /reset-password`
- **Issue:** Accepts `{ username, newPassword }` with no authentication or verification. Anyone can reset any user's password.
- **Fix:** Implement a proper UX flow — either require the current password (change-password while logged in) or add an email-based reset with a time-limited token.

### 12. Weak password policy

- **File:** `src/server/routes/auth.ts`
- **Issue:** Minimum 6 characters, no complexity requirements.
- **Fix:** Require 8+ characters with mixed case + number, or 12+ characters with no complexity rules (NIST recommendation). Implement together with #1.
