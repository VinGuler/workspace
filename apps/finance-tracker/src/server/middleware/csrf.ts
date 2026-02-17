import crypto from 'crypto';
import { type Request, type Response, type NextFunction } from 'express';

const CSRF_COOKIE = 'ft_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Sets a CSRF token cookie if one isn't already present.
 * The cookie is readable by client JS (not httpOnly) so the SPA
 * can send it back in a header on state-changing requests.
 */
export function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
  next();
}

/**
 * Double-submit cookie CSRF protection.
 * Validates that the X-CSRF-Token header matches the ft_csrf cookie
 * on all non-safe (state-changing) requests to /api/*.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Only protect API routes
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ success: false, error: 'Invalid CSRF token' });
    return;
  }

  next();
}
