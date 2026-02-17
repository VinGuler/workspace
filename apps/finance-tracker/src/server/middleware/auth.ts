import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@workspace/database';
import { JWT_SECRET, COOKIE_NAME } from '../config.js';
import type { JwtPayload } from '../types.js';

// Augment Express Request to include user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: number; username: string };
  }
}

export function createRequireAuth(prisma: PrismaClient) {
  return async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      // Validate tokenVersion against the database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { tokenVersion: true },
      });

      if (!user || user.tokenVersion !== decoded.tokenVersion) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      req.user = { id: decoded.id, username: decoded.username };
      next();
    } catch {
      res.status(401).json({ success: false, error: 'Not authenticated' });
    }
  };
}
