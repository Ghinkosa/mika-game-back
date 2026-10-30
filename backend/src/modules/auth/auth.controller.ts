import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { loginSchema, registerSchema, changePasswordSchema } from './auth.schemas.js';
import { audit } from '../../middleware/audit.middleware.js';
import { isProduction } from '../../config/index.js';

export class AuthController {
  static getCsrfToken(req: Request, res: Response) {
    req.session.csrfToken ??= crypto.randomBytes(32).toString('hex');
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not initialize session' });
      }
      return res.json({ csrfToken: req.session.csrfToken });
    });
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = registerSchema.parse(req.body);
      const user = await AuthService.registerPlayer(input as {
        username: string;
        displayName: string;
        password: string;
        phoneNumber?: string;
        cbeAccount?: string;
        agentId?: string;
      });

      await audit(req, 'auth.register', 'user', user.id, {
        role: user.role,
        status: user.status
      });

      return res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role,
          status: user.status,
          createdAt: user.created_at
        },
        message: 'Registration successful. Your account is active and ready to use.'
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        return res.status(409).json({ error: 'Username is unavailable' });
      }
      return next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const user = await AuthService.authenticateUser(input.username, input.password);

      req.session.regenerate(async (err) => {
        if (err) return next(err);

        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        const csrfToken = req.session.csrfToken;

        req.session.save(async (saveErr) => {
          if (saveErr) return next(saveErr);
          await audit(req, 'auth.login_success', 'user', user.id, { role: user.role });

          return res.json({
            user: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              role: user.role,
              status: user.status
            },
            csrfToken
          });
        });
      });
    } catch (err) {
      return next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.session.userId) {
        return res.status(200).json({ user: null });
      }

      const user = await AuthService.getUserById(req.session.userId).catch(() => null);
      if (!user || user.status !== 'ACTIVE') {
        return req.session.destroy((err) => {
          if (err) return next(err);
          res.clearCookie(isProduction ? '__Host-mika.sid' : 'mika.sid', {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/'
          });
          return res.status(200).json({ user: null });
        });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role,
          status: user.status,
          parentId: user.parent_id,
          phoneNumber: user.phone_number,
          commissionRate: user.commission_rate,
          createdAt: user.created_at
        }
      });
    } catch (err) {
      return next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await audit(req, 'auth.logout', 'user', req.session.userId);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie(isProduction ? '__Host-mika.sid' : 'mika.sid', {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          path: '/'
        });
        return res.status(204).end();
      });
    } catch (err) {
      return next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const input = changePasswordSchema.parse(req.body);
      await AuthService.changePassword(req.session.userId!, input.currentPassword, input.newPassword);
      await audit(req, 'auth.password_changed', 'user', req.session.userId);
      return res.json({ message: 'Password changed successfully' });
    } catch (err) {
      return next(err);
    }
  }
}
