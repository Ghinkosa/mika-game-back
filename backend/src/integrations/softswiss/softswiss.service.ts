import crypto from 'node:crypto';
import { pool } from '../../database/connection.js';
import { transaction } from '../../database/transaction.js';
import {
  validateMoneyString,
  addMoneyStrings,
  subMoneyStrings,
  compareMoneyStrings,
  numberToCompliantString,
  compliantStringToNumber
} from '../../shared/stringDecimalMath.js';
import { config } from '../../config/index.js';
import type { SoftSwissPlayPayload, SoftSwissRollbackPayload, SoftSwissResponse } from './softswiss.types.js';

export class SoftSwissService {
  static verifySignature(rawBody: string, signatureHeader?: string): boolean {
    const secret = config.SOFTSWISS_SECRET_SIGN_KEY;
    if (!secret) return true; // If no secret configured, allow in development/staging
    if (!signatureHeader) return false;

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  static async handlePlay(payload: SoftSwissPlayPayload): Promise<SoftSwissResponse> {
    const betStr = payload.bet ? payload.bet.trim() : '0.00';
    const winStr = payload.win ? payload.win.trim() : '0.00';

    if (!validateMoneyString(betStr) || !validateMoneyString(winStr)) {
      throw { code: 100, message: 'Invalid money amount format (string up to 18 digits int, 12 digits fraction expected)' };
    }

    const betMinor = Math.round(compliantStringToNumber(betStr) * 100);
    const winMinor = Math.round(compliantStringToNumber(winStr) * 100);

    return await transaction(async (client) => {
      // Find user by ID or username
      let userQuery = await client.query(
        `SELECT u.id, w.balance_minor, w.currency
         FROM users u
         JOIN wallets w ON w.user_id = u.id
         WHERE u.id::text = $1 OR u.username = $1
         FOR UPDATE OF w`,
        [payload.user_id]
      );

      if (!userQuery.rowCount) {
        throw { code: 101, message: 'Player not found' };
      }

      const wallet = userQuery.rows[0];
      const currentMinor = BigInt(wallet.balance_minor);

      if (currentMinor < BigInt(betMinor)) {
        throw { code: 102, message: 'Player has insufficient funds' };
      }

      const newBalanceMinor = currentMinor - BigInt(betMinor) + BigInt(winMinor);

      // Create ledger transaction
      const tx = await client.query(
        `INSERT INTO ledger_transactions (transaction_type, reference, description, created_by)
         VALUES ('SOFTSWISS_PLAY', $1, $2, $3)
         RETURNING id`,
        [
          payload.round_id ?? payload.session_id ?? `ss-${Date.now()}`,
          `SoftSwiss Play: ${payload.game} (Bet: ${betStr}, Win: ${winStr})`,
          wallet.id
        ]
      );
      const txId = tx.rows[0].id;

      // Update wallet
      await client.query(
        `UPDATE wallets SET balance_minor = $1, updated_at = now() WHERE user_id = $2`,
        [newBalanceMinor.toString(), wallet.id]
      );

      // Ledger entries
      const netChangeMinor = winMinor - betMinor;
      if (netChangeMinor !== 0) {
        await client.query(
          `INSERT INTO ledger_entries (transaction_id, user_id, amount_minor, currency)
           VALUES ($1, $2, $3, $4)`,
          [txId, wallet.id, netChangeMinor, wallet.currency]
        );
      }

      // Record in bets table
      await client.query(
        `INSERT INTO bets (transaction_id, user_id, game_code, provider_code, round_id, bet_amount_minor, win_amount_minor, status)
         VALUES ($1, $2, $3, 'softswiss', $4, $5, $6, 'SETTLED')`,
        [txId, wallet.id, payload.game_id, payload.round_id ?? null, betMinor, winMinor]
      );

      const formattedBalance = numberToCompliantString(Number(newBalanceMinor) / 100);

      return {
        balance: formattedBalance,
        transaction_id: txId
      };
    });
  }

  static async handleRollback(payload: SoftSwissRollbackPayload): Promise<SoftSwissResponse> {
    return await transaction(async (client) => {
      // Find wallet
      const userQuery = await client.query(
        `SELECT u.id, w.balance_minor FROM users u JOIN wallets w ON w.user_id = u.id WHERE u.id::text = $1 OR u.username = $1 FOR UPDATE OF w`,
        [payload.user_id]
      );

      if (!userQuery.rowCount) {
        throw { code: 101, message: 'Player not found' };
      }

      const wallet = userQuery.rows[0];

      // Mark matching bet as rolled back if exists
      if (payload.original_action_id || payload.transaction_id) {
        await client.query(
          `UPDATE bets SET status = 'ROLLED_BACK'
           WHERE (round_id = $1 OR external_bet_id = $2 OR transaction_id::text = $2) AND user_id = $3`,
          [payload.round_id ?? null, payload.transaction_id, wallet.id]
        );
      }

      const formattedBalance = numberToCompliantString(Number(wallet.balance_minor) / 100);
      return {
        balance: formattedBalance,
        transaction_id: payload.transaction_id
      };
    });
  }

  static async getPlayerBalance(userId: string): Promise<string> {
    const result = await pool.query(
      `SELECT w.balance_minor FROM users u JOIN wallets w ON w.user_id = u.id WHERE u.id::text = $1 OR u.username = $1`,
      [userId]
    );

    if (!result.rowCount) {
      throw { code: 101, message: 'Player not found' };
    }

    return numberToCompliantString(Number(result.rows[0].balance_minor) / 100);
  }
}
