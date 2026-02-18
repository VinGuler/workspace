import { Router } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@workspace/database';
import { createRequireAuth } from '../middleware/auth.js';
import { encryptEmail, decryptEmail, hashEmail } from '../services/encryption.js';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const masked = local.length <= 1 ? '*' : local[0] + '***';
  return `${masked}@${domain}`;
}

export function userRouter(prisma: PrismaClient): Router {
  const router = Router();
  const requireAuth = createRequireAuth(prisma);

  // GET /api/user/me/email — return masked email for authenticated user
  router.get('/me/email', requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { emailEncrypted: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const email = decryptEmail(user.emailEncrypted);
    res.json({ success: true, data: { maskedEmail: maskEmail(email) } });
  });

  // PUT /api/user/email — update email (requires current password)
  router.put('/email', requireAuth, async (req, res) => {
    const { currentPassword, newEmail } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      res.status(400).json({ success: false, error: 'Current password is required' });
      return;
    }

    if (!newEmail || typeof newEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      res.status(400).json({ success: false, error: 'A valid email address is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Current password is incorrect' });
      return;
    }

    try {
      const emailHash = hashEmail(newEmail);
      const emailEncrypted = encryptEmail(newEmail.trim().toLowerCase());

      await prisma.user.update({
        where: { id: user.id },
        data: { emailHash, emailEncrypted },
      });

      const email = decryptEmail(emailEncrypted);
      res.json({ success: true, data: { maskedEmail: maskEmail(email) } });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }
      throw err;
    }
  });

  return router;
}
