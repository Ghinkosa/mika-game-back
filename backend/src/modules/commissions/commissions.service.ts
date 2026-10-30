import { pool } from '../../database/connection.js';
import { NotFoundError, BadRequestError } from '../../shared/errors.js';
import type { UserRole } from '../../shared/types.js';

export class CommissionsService {
  static async getCommissionsForUser(userId: string, role: UserRole) {
    if (role === 'ADMIN') {
      const summary = await pool.query(
        `SELECT u.id AS "agentId", u.username, u.display_name AS "displayName", u.role,
                u.commission_rate AS "commissionRate",
                COALESCE(SUM(c.turnover_minor), 0) AS "totalTurnoverMinor",
                COALESCE(SUM(c.commission_amount_minor), 0) AS "totalCommissionMinor"
         FROM users u
         LEFT JOIN commissions c ON c.agent_id = u.id
         WHERE u.role IN ('SUPER_AGENT', 'AGENT')
         GROUP BY u.id, u.username, u.display_name, u.role, u.commission_rate
         ORDER BY u.role, u.created_at DESC`
      );
      return summary.rows;
    }

    const result = await pool.query(
      `SELECT c.id, c.source_user_id AS "sourceUserId", c.period_start AS "periodStart",
              c.period_end AS "periodEnd", c.turnover_minor AS "turnoverMinor",
              c.commission_amount_minor AS "commissionAmountMinor", c.status, c.created_at AS "createdAt",
              src.username AS "sourceUsername", src.display_name AS "sourceDisplayName"
       FROM commissions c
       LEFT JOIN users src ON src.id = c.source_user_id
       WHERE c.agent_id = $1
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [userId]
    );

    return result.rows;
  }

  static async updateCommissionRate(adminUserId: string, targetAgentId: string, newRate: number) {
    if (newRate < 0 || newRate > 100) {
      throw new BadRequestError('Commission rate must be between 0 and 100%');
    }

    const updated = await pool.query(
      `UPDATE users
       SET commission_rate = $1, updated_at = now()
       WHERE id = $2 AND role IN ('SUPER_AGENT', 'AGENT')
       RETURNING id, username, display_name AS "displayName", role, commission_rate AS "commissionRate"`,
      [newRate, targetAgentId]
    );

    if (!updated.rowCount) {
      throw new NotFoundError('Target agent not found or invalid role');
    }

    return updated.rows[0];
  }
}
