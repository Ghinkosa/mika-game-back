import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Public unauthenticated routes (register, login) rely on rate limiting and origin checks
  if (!req.session.userId) return next();

  const expected = req.session.csrfToken;
  const supplied = req.header('x-csrf-token');

  if (!expected || !supplied) {
    return res.status(403).json({ error: 'CSRF token required' });
  }

  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}
