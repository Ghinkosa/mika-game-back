import { pool } from '../../database/connection.js';
import type { UserRole } from '../../shared/types.js';

export class TransactionsService {
  static async getUserLedger(userId: string, limit = 100) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const result = await pool.query(
      `SELECT t.id AS "transactionId",
              t.transaction_type AS type,
              t.status,
              t.reference,
              t.description,
              e.amount_minor AS "amountMinor",
              e.currency,
              e.created_at AS "createdAt"
       FROM ledger_entries e
       JOIN ledger_transactions t ON t.id = e.transaction_id
       WHERE e.user_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );

    return result.rows;
  }

  static async getAllTransactions(role: UserRole, limit = 100) {
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const result = await pool.query(
      `SELECT t.id, t.transaction_type AS type, t.status, t.reference, t.description,
              t.created_by AS "createdBy", t.created_at AS "createdAt",
              u.username AS "creatorUsername", u.display_name AS "creatorDisplayName",
              json_agg(json_build_object(
                'userId', e.user_id,
                'username', eu.username,
                'amountMinor', e.amount_minor,
                'currency', e.currency
              )) AS entries
       FROM ledger_transactions t
       LEFT JOIN users u ON u.id = t.created_by
       JOIN ledger_entries e ON e.transaction_id = t.id
       JOIN users eu ON eu.id = e.user_id
       GROUP BY t.id, u.username, u.display_name
       ORDER BY t.created_at DESC
       LIMIT $1`,
      [safeLimit]
    );

    return result.rows;
  }
}
