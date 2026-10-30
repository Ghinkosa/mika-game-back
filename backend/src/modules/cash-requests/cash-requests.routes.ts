import { Router } from 'express';
import { CashRequestsController } from './cash-requests.controller.js';
import { requireAuth, requireRoles } from '../../middleware/auth.middleware.js';

export const cashRequestsRouter = Router();

cashRequestsRouter.get('/', requireAuth, CashRequestsController.list);
cashRequestsRouter.post('/', requireAuth, CashRequestsController.create);
cashRequestsRouter.patch('/:id/resolve', requireRoles('ADMIN', 'SUPER_AGENT', 'AGENT'), CashRequestsController.resolve);
