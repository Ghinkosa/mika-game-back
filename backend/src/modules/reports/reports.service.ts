import { pool } from '../../database/connection.js';

export class ReportsService {
  static async getSummaryReport() {
    const totals = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE role = 'PLAYER') AS "totalPlayers",
        (SELECT COUNT(*)::int FROM users WHERE role IN ('AGENT', 'SUPER_AGENT')) AS "totalAgents",
        (SELECT COALESCE(SUM(balance_minor), 0) FROM wallets) AS "totalSystemBalanceMinor",
        (SELECT COUNT(*)::int FROM bets) AS "totalBetsCount",
        (SELECT COALESCE(SUM(bet_amount_minor), 0) FROM bets) AS "totalBetAmountMinor",
        (SELECT COALESCE(SUM(win_amount_minor), 0) FROM bets) AS "totalWinAmountMinor"
    `);

    const row = totals.rows[0];
    const betMinor = BigInt(row.totalBetAmountMinor);
    const winMinor = BigInt(row.totalWinAmountMinor);
    const ggrMinor = betMinor - winMinor;

    return {
      totalPlayers: row.totalPlayers,
      totalAgents: row.totalAgents,
      totalSystemBalanceMinor: row.totalSystemBalanceMinor.toString(),
      totalBetsCount: row.totalBetsCount,
      totalBetAmountMinor: betMinor.toString(),
      totalWinAmountMinor: winMinor.toString(),
      grossGamingRevenueMinor: ggrMinor.toString()
    };
  }

  static async getAuditEvents(limit = 100) {
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const result = await pool.query(
      `SELECT a.id, a.actor_user_id AS "actorUserId", u.username AS "actorUsername",
              a.action, a.target_type AS "targetType", a.target_id AS "targetId",
              a.ip_address AS "ipAddress", a.user_agent AS "userAgent",
              a.metadata, a.created_at AS "createdAt"
       FROM audit_events a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [safeLimit]
    );

    return result.rows;
  }
}
