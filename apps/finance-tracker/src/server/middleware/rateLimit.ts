import rateLimit from 'express-rate-limit';
import { type Request, type Response, type NextFunction } from 'express';

const isTest = process.env.NODE_ENV === 'test';

// No-op middleware for test environment
function noopMiddleware(_req: Request, _res: Response, next: NextFunction) {
  next();
}

function createLimiter(options: Parameters<typeof rateLimit>[0]) {
  return isTest ? noopMiddleware : rateLimit(options);
}

// Login: 5 attempts per 15 minutes per IP
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts, please try again later' },
});

// Registration: 3 per hour per IP
export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many registration attempts, please try again later' },
});

// Password reset: 3 per hour per IP
export const resetPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many password reset attempts, please try again later' },
});

// User search: 20 per minute per IP
export const userSearchLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many search requests, please try again later' },
});
