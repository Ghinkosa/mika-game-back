import { Router } from 'express';
import { WalletController } from './wallet.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export const walletRouter = Router();

walletRouter.get('/balance', requireAuth, WalletController.getBalance);
walletRouter.post('/transfer', requireAuth, WalletController.transfer);
