import { pool } from '../../database/connection.js';
import { transaction } from '../../database/transaction.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../shared/errors.js';
import { config } from '../../config/index.js';
import type { UserRole } from '../../shared/types.js';

export class WalletService {
  static async getBalance(userId: string) {
    const result = await pool.query(
      `SELECT currency, balance_minor AS "balanceMinor", updated_at AS "updatedAt"
       FROM wallets
       WHERE user_id = $1`,
      [userId]
    );

    if (!result.rowCount) {
      throw new NotFoundError('Wallet not found');
    }

    return result.rows[0];
  }

  static async transfer(
    fromUserId: string,
    toUserId: string,
    amountMinor: number,
    currency: string,
    idemKey: string,
    reference?: string,
    userRole?: UserRole
  ): Promise<{ id: string; replay: boolean }> {
    if (fromUserId === toUserId) {
      throw new BadRequestError('Cannot transfer to the same account');
    }

    if (userRole === 'PLAYER' && config.ALLOW_PLAYER_TRANSFERS !== 'true') {
      throw new ForbiddenError('Direct peer-to-peer player transfers are disabled by casino policy');
    }

    return await transaction(async (client) => {
      // 1. Check idempotency
      const previous = await client.query(
        `SELECT id FROM ledger_transactions WHERE idempotency_key = $1`,
        [idemKey]
      );

      if (previous.rowCount) {
        return {
          id: previous.rows[0].id,
          replay: true
        };
      }

      // 2. Lock both wallet records in consistent deterministic order to avoid deadlocks
      const sortedIds = [fromUserId, toUserId].sort();
      const locked = await client.query(
        `SELECT user_id, currency, balance_minor
         FROM wallets
         WHERE user_id = ANY($1::uuid[])
         ORDER BY user_id
         FOR UPDATE`,
        [sortedIds]
      );

      if (locked.rowCount !== 2) {
        throw new NotFoundError('One or both wallets could not be found');
      }

      const fromWallet = locked.rows.find((r) => r.user_id === fromUserId);
      const toWallet = locked.rows.find((r) => r.user_id === toUserId);

      if (!fromWallet || !toWallet || fromWallet.currency !== currency || toWallet.currency !== currency) {
        throw new BadRequestError(`Currency mismatch or invalid wallet currencies (expected ${currency})`);
      }

      if (BigInt(fromWallet.balance_minor) < BigInt(amountMinor)) {
        throw new ConflictError('Insufficient available wallet balance');
      }

      // 3. Insert posted ledger transaction header
      const createdTx = await client.query(
        `INSERT INTO ledger_transactions (transaction_type, idempotency_key, reference, description, created_by)
         VALUES ('TRANSFER', $1, $2, 'Wallet credit transfer', $3)
         RETURNING id`,
        [idemKey, reference ?? null, fromUserId]
      );
      const txId = createdTx.rows[0].id;

      // 4. Update balances
      await client.query(
        `UPDATE wallets SET balance_minor = balance_minor - $1, updated_at = now() WHERE user_id = $2`,
        [amountMinor, fromUserId]
      );
      await client.query(
        `UPDATE wallets SET balance_minor = balance_minor + $1, updated_at = now() WHERE user_id = $2`,
        [amountMinor, toUserId]
      );

      // 5. Insert double-entry ledger debit & credit lines
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, user_id, amount_minor, currency)
         VALUES ($1, $2, $3, $4), ($1, $5, $6, $4)`,
        [txId, fromUserId, -amountMinor, currency, toUserId, amountMinor]
      );

      return {
        id: txId,
        replay: false
      };
    });
  }
}
