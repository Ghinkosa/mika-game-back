import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AccountsService } from './accounts.service.js';
import { audit } from '../../middleware/audit.middleware.js';

export class AccountsController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await AccountsService.getAccountDetails(req.session.userId!);
      return res.json({ account });
    } catch (err) {
      return next(err);
    }
  }

  static async getAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 50;
      const accounts = await AccountsService.listAccountsHierarchy(
        req.session.userId!,
        req.session.role!,
        limit
      );
      return res.json({ accounts });
    } catch (err) {
      return next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const input = z.object({
        status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED', 'PENDING'])
      }).parse(req.body);

      const user = await AccountsService.updateUserStatus(req.params.id, input.status);
      await audit(req, 'admin.user_status_changed', 'user', req.params.id, {
        status: input.status
      });

      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
}
