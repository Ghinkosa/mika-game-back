import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CommissionsService } from './commissions.service.js';
import { audit } from '../../middleware/audit.middleware.js';

export class CommissionsController {
  static async getCommissions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CommissionsService.getCommissionsForUser(req.session.userId!, req.session.role!);
      return res.json({ commissions: data });
    } catch (err) {
      return next(err);
    }
  }

  static async updateRate(req: Request, res: Response, next: NextFunction) {
    try {
      const input = z.object({
        commissionRate: z.number().min(0).max(100)
      }).parse(req.body);

      const agent = await CommissionsService.updateCommissionRate(
        req.session.userId!,
        req.params.id,
        input.commissionRate
      );

      await audit(req, 'admin.commission_rate_updated', 'user', req.params.id, {
        newRate: input.commissionRate
      });

      return res.json({ agent });
    } catch (err) {
      return next(err);
    }
  }
}
