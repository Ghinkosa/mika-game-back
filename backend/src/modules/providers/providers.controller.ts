import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProvidersService } from './providers.service.js';

export class ProvidersController {
  static listProviders(_req: Request, res: Response) {
    const providers = ProvidersService.getProviders();
    return res.json({ providers });
  }

  static launchGame(req: Request, res: Response, next: NextFunction) {
    try {
      const input = z.object({
        gameId: z.string().min(1),
        mode: z.enum(['real', 'demo']).default('real')
      }).parse(req.body);

      const userId = req.session.userId ?? 'anonymous';
      const launchUrl = ProvidersService.generateLauncherUrl(input.gameId, userId, input.mode);

      return res.json({
        launchUrl,
        gameId: input.gameId,
        mode: input.mode
      });
    } catch (err) {
      return next(err);
    }
  }
}
