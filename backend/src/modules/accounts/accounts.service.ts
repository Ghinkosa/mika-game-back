import { pool } from '../../database/connection.js';
import { NotFoundError } from '../../shared/errors.js';
import type { UserRole, AccountStatus } from '../../shared/types.js';

export class AccountsService {
  static async getAccountDetails(userId: string) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.display_name AS "displayName", u.role, u.status,
              u.parent_id AS "parentId", u.phone_number AS "phoneNumber", u.cbe_account AS "cbeAccount",
              u.commission_rate AS "commissionRate", w.currency,
              w.balance_minor AS "balanceMinor", u.created_at AS "createdAt"
       FROM users u
       JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (!result.rowCount) {
      throw new NotFoundError('Account not found');
    }

    return result.rows[0];
  }

  static async listAccountsHierarchy(userId: string, role: UserRole, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);

    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id FROM users WHERE parent_id = $1
        UNION ALL
        SELECT u.id
        FROM users u
        JOIN descendants d ON u.parent_id = d.id
      )
      SELECT u.id, u.username, u.display_name AS "displayName", u.role, u.status,
             u.parent_id AS "parentId", u.phone_number AS "phoneNumber", u.cbe_account AS "cbeAccount",
             u.commission_rate AS "commissionRate", w.currency,
             w.balance_minor AS "balanceMinor", u.created_at AS "createdAt"
      FROM users u
      JOIN wallets w ON w.user_id = u.id
      WHERE ($2::boolean OR u.id IN (SELECT id FROM descendants))
      ORDER BY u.created_at DESC
      LIMIT $3`;

    const isAdmin = role === 'ADMIN';
    const result = await pool.query(query, [userId, isAdmin, safeLimit]);
    return result.rows;
  }

  static async updateUserStatus(targetUserId: string, newStatus: AccountStatus) {
    const updated = await pool.query(
      `UPDATE users
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, username, display_name AS "displayName", role, status`,
      [newStatus, targetUserId]
    );

    if (!updated.rowCount) {
      throw new NotFoundError('Target user not found');
    }

    return updated.rows[0];
  }
}
