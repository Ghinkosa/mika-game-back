import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { requireRoles } from '../../middleware/auth.middleware.js';

export const reportsRouter = Router();

reportsRouter.get('/summary', requireRoles('ADMIN', 'SUPER_AGENT'), ReportsController.getSummary);
reportsRouter.get('/audit', requireRoles('ADMIN'), ReportsController.getAudit);
