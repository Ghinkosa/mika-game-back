import { Router } from 'express';
import { AccountsController } from './accounts.controller.js';
import { requireAuth, requireRoles } from '../../middleware/auth.middleware.js';

export const accountsRouter = Router();

// Current logged-in user's account details
accountsRouter.get('/me', requireAuth, AccountsController.getMe);

// Subordinate accounts hierarchy (Admin sees all, Super Agent sees branch, Agent sees assigned players)
accountsRouter.get('/', requireRoles('ADMIN', 'SUPER_AGENT', 'AGENT'), AccountsController.getAccounts);

// Admin-only user status update (ACTIVE, SUSPENDED, CLOSED)
accountsRouter.post('/admin/users/:id/status', requireRoles('ADMIN'), AccountsController.updateStatus);
