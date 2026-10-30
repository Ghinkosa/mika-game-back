import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../shared/types.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.role) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId || !req.session.role) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}
