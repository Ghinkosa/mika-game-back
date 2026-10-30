import { Router } from 'express';
import { TransactionsController } from './transactions.controller.js';
import { requireAuth, requireRoles } from '../../middleware/auth.middleware.js';

export const transactionsRouter = Router();

// Current user's ledger entries (double-entry audit trail)
transactionsRouter.get('/me', requireAuth, TransactionsController.getMyLedger);

// Admin-level transaction oversight
transactionsRouter.get('/', requireRoles('ADMIN', 'SUPER_AGENT'), TransactionsController.getAll);
