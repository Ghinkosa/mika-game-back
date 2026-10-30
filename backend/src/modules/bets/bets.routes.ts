import { Router } from 'express';
import { BetsController } from './bets.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export const betsRouter = Router();

betsRouter.post('/', requireAuth, BetsController.placeBet);
betsRouter.get('/history', requireAuth, BetsController.getHistory);
