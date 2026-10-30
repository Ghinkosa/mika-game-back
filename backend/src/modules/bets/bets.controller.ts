import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BetsService } from './bets.service.js';
import { audit } from '../../middleware/audit.middleware.js';

const betSchema = z.object({
  amountMinor: z.number().int().positive().max(100000000), // Max 1M ETB
  gameCode: z.string().trim().min(1).max(64),
  providerCode: z.string().trim().max(64).optional(),
  roundId: z.string().trim().max(128).optional(),
  externalBetId: z.string().trim().min(1).max(128)
});

export class BetsController {
  static async placeBet(req: Request, res: Response, next: NextFunction) {
    try {
      const input = betSchema.parse(req.body);
      const idemKey = req.header('idempotency-key');

      if (!idemKey || idemKey.length > 128) {
        return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
      }

      const result = await BetsService.recordBetDebit({
        userId: req.session.userId!,
        amountMinor: input.amountMinor,
        gameCode: input.gameCode,
        providerCode: input.providerCode,
        roundId: input.roundId,
        externalBetId: input.externalBetId,
        idemKey
      });

      await audit(req, 'bet.debit_recorded', 'ledger_transaction', result.id, {
        gameCode: input.gameCode,
        amountMinor: input.amountMinor,
        replay: result.replay
      });

      return res.status(result.replay ? 200 : 201).json({
        transactionId: result.id,
        replayed: result.replay
      });
    } catch (err) {
      return next(err);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 50;
      const bets = await BetsService.getUserBets(req.session.userId!, limit);
      return res.json({ bets });
    } catch (err) {
      return next(err);
    }
  }
}
