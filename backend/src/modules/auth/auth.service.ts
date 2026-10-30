import argon2 from 'argon2';
import { pool } from '../../database/connection.js';
import { transaction } from '../../database/transaction.js';
import { UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '../../shared/errors.js';
import type { UserRecord } from '../../shared/types.js';

export class AuthService {
  static async registerPlayer(input: {
    username: string;
    displayName: string;
    password: string;
    phoneNumber?: string;
    cbeAccount?: string;
    agentId?: string;
  }): Promise<UserRecord> {
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1
    });

    return await transaction(async (client) => {
      // Validate parent agent if provided
      let parentId: string | null = null;
      if (input.agentId) {
        const parentCheck = await client.query(
          `SELECT id FROM users WHERE id = $1 AND role IN ('AGENT', 'SUPER_AGENT') AND status = 'ACTIVE'`,
          [input.agentId]
        );
        if (parentCheck.rowCount) {
          parentId = parentCheck.rows[0].id;
        }
      }

      const created = await client.query(
        `INSERT INTO users (username, display_name, password_hash, role, status, parent_id, phone_number, cbe_account)
         VALUES ($1, $2, $3, 'PLAYER', 'ACTIVE', $4, $5, $6)
         RETURNING id, username, display_name, role, status, parent_id, phone_number, cbe_account, commission_rate, created_at, updated_at`,
        [
          input.username,
          input.displayName,
          passwordHash,
          parentId,
          input.phoneNumber ?? null,
          input.cbeAccount ?? null
        ]
      );

      const user = created.rows[0] as UserRecord;

      // Automatically create the initial player's ETB wallet with 0 balance
      await client.query(
        `INSERT INTO wallets (user_id, currency, balance_minor)
         VALUES ($1, 'ETB', 0)`,
        [user.id]
      );

      return user;
    });
  }

  static async authenticateUser(username: string, plainPassword: string): Promise<UserRecord> {
    const result = await pool.query(
      `SELECT id, username, display_name, password_hash, role, status, parent_id, phone_number, cbe_account, commission_rate, created_at, updated_at
       FROM users
       WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];
    const isValid = user
      ? await argon2.verify(user.password_hash, plainPassword).catch(() => false)
      : false;

    if (!user || !isValid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError(`Account status is ${user.status}. Please contact support.`);
    }

    return user;
  }

  static async getUserById(userId: string): Promise<UserRecord> {
    const result = await pool.query(
      `SELECT id, username, display_name, role, status, parent_id, phone_number, cbe_account, commission_rate, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (!result.rowCount) {
      throw new NotFoundError('User not found');
    }

    return result.rows[0] as UserRecord;
  }

  static async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const found = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1 AND status = 'ACTIVE'`,
      [userId]
    );

    if (!found.rowCount) {
      throw new NotFoundError('User not found');
    }

    const isValid = await argon2.verify(found.rows[0].password_hash, currentPass).catch(() => false);
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    const hash = await argon2.hash(newPass, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1
    });

    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [hash, userId]
    );
  }
}
