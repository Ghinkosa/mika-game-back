import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CashRequestsService } from './cash-requests.service.js';
import { audit } from '../../middleware/audit.middleware.js';

const createRequestSchema = z.object({
  targetAgentId: z.string().uuid(),
  requestType: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  amountMinor: z.number().int().positive().max(1000000000), // Up to 10M ETB in cents
  notes: z.string().trim().max(250).optional()
});

export class CashRequestsController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createRequestSchema.parse(req.body);
      const request = await CashRequestsService.createRequest({
        userId: req.session.userId!,
        targetAgentId: input.targetAgentId,
        requestType: input.requestType,
        amountMinor: input.amountMinor,
        notes: input.notes
      });

      await audit(req, 'cash_request.created', 'cash_request', request.id, {
        type: input.requestType,
        amountMinor: input.amountMinor,
        agentId: input.targetAgentId
      });

      return res.status(201).json({ request });
    } catch (err) {
      return next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await CashRequestsService.listRequests(req.session.userId!, req.session.role!);
      return res.json({ requests });
    } catch (err) {
      return next(err);
    }
  }

  static async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const input = z.object({
        status: z.enum(['APPROVED', 'REJECTED'])
      }).parse(req.body);

      const result = await CashRequestsService.resolveRequest(
        req.params.id,
        req.session.userId!,
        input.status
      );

      await audit(req, 'cash_request.resolved', 'cash_request', req.params.id, {
        status: input.status,
        transactionId: (result as any).transactionId
      });

      return res.json(result);
    } catch (err) {
      return next(err);
    }
  }
}
