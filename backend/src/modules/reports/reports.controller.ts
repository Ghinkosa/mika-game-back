import type { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';

export class ReportsController {
  static async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await ReportsService.getSummaryReport();
      return res.json({ summary });
    } catch (err) {
      return next(err);
    }
  }

  static async getAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 100;
      const events = await ReportsService.getAuditEvents(limit);
      return res.json({ events });
    } catch (err) {
      return next(err);
    }
  }
}
