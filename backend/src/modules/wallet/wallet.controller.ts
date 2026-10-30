import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WalletService } from './wallet.service.js';
import { audit } from '../../middleware/audit.middleware.js';

const transferSchema = z.object({
  toUserId: z.string().uuid(),
  amountMinor: z.number().int().positive().max(10000000000), // Max 100M ETB in cents
  currency: z.string().length(3).default('ETB'),
  reference: z.string().trim().max(128).optional()
});

export class WalletController {
  static async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const wallet = await WalletService.getBalance(req.session.userId!);
      return res.json({ wallet });
    } catch (err) {
      return next(err);
    }
  }

  static async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const input = transferSchema.parse(req.body);
      const idemKey = req.header('idempotency-key');

      if (!idemKey || idemKey.length > 128) {
        return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
      }

      const tx = await WalletService.transfer(
        req.session.userId!,
        input.toUserId,
        input.amountMinor,
        input.currency,
        idemKey,
        input.reference,
        req.session.role
      );

      await audit(req, 'wallet.transfer', 'ledger_transaction', tx.id, {
        toUserId: input.toUserId,
        amountMinor: input.amountMinor,
        replay: tx.replay
      });

      return res.status(tx.replay ? 200 : 201).json({
        transactionId: tx.id,
        replayed: tx.replay
      });
    } catch (err) {
      return next(err);
    }
  }
}
