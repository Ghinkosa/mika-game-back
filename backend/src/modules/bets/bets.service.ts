import { pool } from '../../database/connection.js';
import { transaction } from '../../database/transaction.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';

export class BetsService {
  static async recordBetDebit(input: {
    userId: string;
    amountMinor: number;
    gameCode: string;
    providerCode?: string;
    roundId?: string;
    externalBetId: string;
    idemKey: string;
  }): Promise<{ id: string; replay: boolean }> {
    return await transaction(async (client) => {
      // 1. Check idempotency
      const previous = await client.query(
        `SELECT id FROM ledger_transactions WHERE idempotency_key = $1`,
        [input.idemKey]
      );

      if (previous.rowCount) {
        return {
          id: previous.rows[0].id,
          replay: true
        };
      }

      // 2. Lock player wallet
      const wallet = await client.query(
        `SELECT currency, balance_minor FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [input.userId]
      );

      if (!wallet.rowCount) {
        throw new NotFoundError('Wallet not found for player');
      }

      const balance = BigInt(wallet.rows[0].balance_minor);
      const amount = BigInt(input.amountMinor);

      if (balance < amount) {
        throw new ConflictError('Insufficient balance to place bet');
      }

      // 3. Create ledger transaction
      const createdTx = await client.query(
        `INSERT INTO ledger_transactions (transaction_type, idempotency_key, reference, description, created_by)
         VALUES ('BET_DEBIT', $1, $2, $3, $4)
         RETURNING id`,
        [
          input.idemKey,
          input.externalBetId,
          `Bet debit: ${input.gameCode}`,
          input.userId
        ]
      );
      const txId = createdTx.rows[0].id;

      // 4. Update wallet balance
      await client.query(
        `UPDATE wallets SET balance_minor = balance_minor - $1, updated_at = now() WHERE user_id = $2`,
        [input.amountMinor, input.userId]
      );

      // 5. Insert ledger entry
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, user_id, amount_minor, currency)
         VALUES ($1, $2, $3, $4)`,
        [txId, input.userId, -input.amountMinor, wallet.rows[0].currency]
      );

      // 6. Record in bets table
      await client.query(
        `INSERT INTO bets (transaction_id, user_id, game_code, provider_code, round_id, external_bet_id, bet_amount_minor, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'SETTLED')`,
        [
          txId,
          input.userId,
          input.gameCode,
          input.providerCode ?? 'softswiss',
          input.roundId ?? null,
          input.externalBetId,
          input.amountMinor
        ]
      );

      return {
        id: txId,
        replay: false
      };
    });
  }

  static async getUserBets(userId: string, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const result = await pool.query(
      `SELECT id, transaction_id AS "transactionId", game_code AS "gameCode",
              provider_code AS "providerCode", round_id AS "roundId", external_bet_id AS "externalBetId",
              bet_amount_minor AS "betAmountMinor", win_amount_minor AS "winAmountMinor",
              status, created_at AS "createdAt"
       FROM bets
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );

    return result.rows;
  }
}
