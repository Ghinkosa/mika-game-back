import { Router } from 'express';
import { CommissionsController } from './commissions.controller.js';
import { requireRoles } from '../../middleware/auth.middleware.js';

export const commissionsRouter = Router();

commissionsRouter.get('/', requireRoles('ADMIN', 'SUPER_AGENT', 'AGENT'), CommissionsController.getCommissions);
commissionsRouter.patch('/:id/rate', requireRoles('ADMIN', 'SUPER_AGENT'), CommissionsController.updateRate);
