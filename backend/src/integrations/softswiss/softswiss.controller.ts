import type { Request, Response } from 'express';
import { SoftSwissService } from './softswiss.service.js';

export class SoftSwissController {
  static async handleWebhook(req: Request, res: Response) {
    try {
      const rawBody = JSON.stringify(req.body);
      const signature = req.header('x-request-sign');

      if (!SoftSwissService.verifySignature(rawBody, signature)) {
        return res.status(403).json({ code: 403, message: 'Invalid signature signature header' });
      }

      const { action } = req.body;

      if (action === 'play') {
        const response = await SoftSwissService.handlePlay(req.body);
        return res.json(response);
      }

      if (action === 'rollback') {
        const response = await SoftSwissService.handleRollback(req.body);
        return res.json(response);
      }

      if (action === 'balance') {
        const balance = await SoftSwissService.getPlayerBalance(req.body.user_id);
        return res.json({ balance });
      }

      return res.status(400).json({ code: 400, message: `Unsupported action: ${action}` });
    } catch (err: any) {
      const code = err?.code || 500;
      const message = err?.message || 'Internal aggregator callback error';
      return res.status(400).json({ code, message });
    }
  }
}
