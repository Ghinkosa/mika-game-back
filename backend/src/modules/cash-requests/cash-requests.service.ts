import { pool } from '../../database/connection.js';
import { transaction } from '../../database/transaction.js';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors.js';
import type { CashRequestType, CashRequestStatus, UserRole } from '../../shared/types.js';

export class CashRequestsService {
  static async createRequest(input: {
    userId: string;
    targetAgentId: string;
    requestType: CashRequestType;
    amountMinor: number;
    notes?: string;
  }) {
    // Verify target agent exists and is ACTIVE AGENT or SUPER_AGENT
    const agentCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role IN ('AGENT', 'SUPER_AGENT') AND status = 'ACTIVE'`,
      [input.targetAgentId]
    );

    if (!agentCheck.rowCount) {
      throw new NotFoundError('Target agent not found or inactive');
    }

    // If withdrawal, verify player has enough balance
    if (input.requestType === 'WITHDRAWAL') {
      const wallet = await pool.query(
        `SELECT balance_minor FROM wallets WHERE user_id = $1`,
        [input.userId]
      );
      if (!wallet.rowCount || BigInt(wallet.rows[0].balance_minor) < BigInt(input.amountMinor)) {
        throw new ConflictError('Insufficient balance for withdrawal request');
      }
    }

    const created = await pool.query(
      `INSERT INTO cash_requests (user_id, target_agent_id, request_type, amount_minor, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id AS "userId", target_agent_id AS "targetAgentId",
                 request_type AS "requestType", amount_minor AS "amountMinor",
                 status, notes, created_at AS "createdAt"`,
      [input.userId, input.targetAgentId, input.requestType, input.amountMinor, input.notes ?? null]
    );

    return created.rows[0];
  }

  static async listRequests(userId: string, role: UserRole) {
    if (role === 'PLAYER') {
      const res = await pool.query(
        `SELECT r.id, r.request_type AS "requestType", r.amount_minor AS "amountMinor",
                r.status, r.notes, r.created_at AS "createdAt",
                a.username AS "agentUsername", a.display_name AS "agentDisplayName"
         FROM cash_requests r
         JOIN users a ON a.id = r.target_agent_id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [userId]
      );
      return res.rows;
    }

    // Agent or Super Agent or Admin sees requests directed to them or all (for Admin)
    const isAdmin = role === 'ADMIN';
    const res = await pool.query(
      `SELECT r.id, r.request_type AS "requestType", r.amount_minor AS "amountMinor",
              r.status, r.notes, r.created_at AS "createdAt",
              u.id AS "userId", u.username AS "playerUsername", u.display_name AS "playerDisplayName",
              a.username AS "agentUsername"
       FROM cash_requests r
       JOIN users u ON u.id = r.user_id
       JOIN users a ON a.id = r.target_agent_id
       WHERE ($1::boolean OR r.target_agent_id = $2)
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [isAdmin, userId]
    );
    return res.rows;
  }

  static async resolveRequest(requestId: string, agentUserId: string, newStatus: 'APPROVED' | 'REJECTED') {
    return await transaction(async (client) => {
      const found = await client.query(
        `SELECT * FROM cash_requests WHERE id = $1 FOR UPDATE`,
        [requestId]
      );

      if (!found.rowCount) {
        throw new NotFoundError('Cash request not found');
      }

      const req = found.rows[0];
      if (req.status !== 'PENDING') {
        throw new BadRequestError(`Cannot resolve request with status ${req.status}`);
      }

      if (newStatus === 'REJECTED') {
        const updated = await client.query(
          `UPDATE cash_requests SET status = 'REJECTED', updated_at = now() WHERE id = $1 RETURNING *`,
          [requestId]
        );
        return { request: updated.rows[0], settled: false };
      }

      // APPROVAL FLOW:
      // DEPOSIT: Agent sends points to Player -> Agent debited, Player credited
      // WITHDRAWAL: Player cashes out points -> Player debited, Agent credited
      const fromUserId = req.request_type === 'DEPOSIT' ? req.target_agent_id : req.user_id;
      const toUserId = req.request_type === 'DEPOSIT' ? req.user_id : req.target_agent_id;

      const ids = [fromUserId, toUserId].sort();
      const locked = await client.query(
        `SELECT user_id, currency, balance_minor FROM wallets WHERE user_id = ANY($1::uuid[]) FOR UPDATE`,
        [ids]
      );

      const fromWallet = locked.rows.find((w) => w.user_id === fromUserId);
      const toWallet = locked.rows.find((w) => w.user_id === toUserId);

      if (!fromWallet || !toWallet) {
        throw new NotFoundError('Wallet for agent or player not found');
      }

      if (BigInt(fromWallet.balance_minor) < BigInt(req.amount_minor)) {
        throw new ConflictError(`Insufficient balance to approve request. Required: ${req.amount_minor}`);
      }

      // Insert ledger transaction
      const tx = await client.query(
        `INSERT INTO ledger_transactions (transaction_type, reference, description, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          `CASH_${req.request_type}`,
          requestId,
          `Cash request approved: ${req.request_type} of ${req.amount_minor} minor units`,
          agentUserId
        ]
      );
      const txId = tx.rows[0].id;

      // Update balances
      await client.query(
        `UPDATE wallets SET balance_minor = balance_minor - $1, updated_at = now() WHERE user_id = $2`,
        [req.amount_minor, fromUserId]
      );
      await client.query(
        `UPDATE wallets SET balance_minor = balance_minor + $1, updated_at = now() WHERE user_id = $2`,
        [req.amount_minor, toUserId]
      );

      // Ledger entries
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, user_id, amount_minor, currency)
         VALUES ($1, $2, $3, 'ETB'), ($1, $4, $5, 'ETB')`,
        [txId, fromUserId, -req.amount_minor, toUserId, req.amount_minor]
      );

      // Mark request approved
      const updatedReq = await client.query(
        `UPDATE cash_requests SET status = 'APPROVED', updated_at = now() WHERE id = $1 RETURNING *`,
        [requestId]
      );

      return { request: updatedReq.rows[0], transactionId: txId, settled: true };
    });
  }
}
