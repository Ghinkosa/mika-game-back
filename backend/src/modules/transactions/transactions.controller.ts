import type { Request, Response, NextFunction } from 'express';
import { TransactionsService } from './transactions.service.js';

export class TransactionsController {
  static async getMyLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 100;
      const entries = await TransactionsService.getUserLedger(req.session.userId!, limit);
      return res.json({ entries });
    } catch (err) {
      return next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 100;
      const transactions = await TransactionsService.getAllTransactions(req.session.role!, limit);
      return res.json({ transactions });
    } catch (err) {
      return next(err);
    }
  }
}
