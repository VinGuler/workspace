import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { PrismaClient } from '@workspace/database';
import {
  JWT_SECRET,
  SALT_ROUNDS,
  TOKEN_EXPIRY,
  COOKIE_NAME,
  APP_BASE_URL,
  RESET_TOKEN_EXPIRY_MS,
} from '../config.js';
import { createRequireAuth } from '../middleware/auth.js';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimit.js';
import { encryptEmail, hashEmail } from '../services/encryption.js';
import { sendPasswordResetEmail } from '../services/email.js';
import type { JwtPayload } from '../types.js';
import { type Response } from 'express';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Returns an error message if invalid, null if valid.
export function validatePassword(p: string): string | null {
  if (!p || typeof p !== 'string') {
    return 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  }
  if (p.length < 8) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  }
  if (!/[A-Z]/.test(p)) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  }
  if (!/[a-z]/.test(p)) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  }
  if (!/[0-9]/.test(p)) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  }
  return null;
}

export function authRouter(prisma: PrismaClient): Router {
  const router = Router();
  const requireAuth = createRequireAuth(prisma);

  // POST /api/auth/register
  router.post('/register', registerLimiter, async (req, res) => {
    try {
      const { username, displayName, password, email } = req.body;

      if (!username || !USERNAME_REGEX.test(username)) {
        res.status(400).json({
          success: false,
          error: 'Username must be 3-30 characters, alphanumeric and underscores only',
        });
        return;
      }

      const trimmedDisplayName = typeof displayName === 'string' ? displayName.trim() : '';
      if (!trimmedDisplayName || trimmedDisplayName.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Display name must be 1-50 characters',
        });
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        res.status(400).json({ success: false, error: passwordError });
        return;
      }

      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
        res.status(400).json({ success: false, error: 'A valid email address is required' });
        return;
      }

      const emailHash = hashEmail(email);
      const emailEncrypted = encryptEmail(email.trim().toLowerCase());
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username,
            displayName: trimmedDisplayName,
            passwordHash,
            emailHash,
            emailEncrypted,
          },
        });

        const workspace = await tx.workspace.create({
          data: { balance: 0 },
        });

        await tx.workspaceUser.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            permission: 'OWNER',
          },
        });

        return user;
      });

      const token = signToken({
        id: result.id,
        username: result.username,
        tokenVersion: result.tokenVersion,
      });
      setCookie(res, token);

      res.json({
        success: true,
        data: {
          id: result.id,
          username: result.username,
          displayName: result.displayName,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const field = err?.meta?.target?.includes('email_hash')
          ? 'Email already registered'
          : 'Username already taken';
        res.status(409).json({ success: false, error: field });
        return;
      }
      throw err;
    }
  });

  // POST /api/auth/login
  router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Username and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      tokenVersion: user.tokenVersion,
    });
    setCookie(res, token);

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  });

  // POST /api/auth/logout — invalidate all sessions by incrementing tokenVersion
  router.post('/logout', requireAuth, async (req, res) => {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tokenVersion: { increment: 1 } },
    });

    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ success: true });
  });

  // GET /api/auth/me — return current user (no sliding renewal)
  router.get('/me', requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, displayName: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  });

  // POST /api/auth/forgot-password — send reset email (always 200, no username enumeration)
  router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ success: false, error: 'Username is required' });
      return;
    }

    // Always return success to prevent username enumeration
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.json({ success: true });
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    if (!user.emailEncrypted) {
      // User pre-dates email collection — no email to send
      console.warn(`[forgot-password] user ${user.id} has no email on record`);
      res.json({ success: true });
      return;
    }

    const { decryptEmail } = await import('../services/encryption.js');
    const email = decryptEmail(user.emailEncrypted);
    const resetUrl = `${APP_BASE_URL}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
      console.info(`[forgot-password] reset email sent to user ${user.id}`);
    } catch (err) {
      // Don't expose email delivery errors to the client, but log for ops visibility
      console.error('[forgot-password] failed to send reset email:', err);
    }

    res.json({ success: true });
  });

  // POST /api/auth/reset-password — validate token, update password
  router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, error: 'Reset token is required' });
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      res.status(400).json({ success: false, error: passwordError });
      return;
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash },
    });

    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      }),
    ]);

    res.json({ success: true });
  });

  return router;
}
