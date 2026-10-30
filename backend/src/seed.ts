import 'dotenv/config';
import argon2 from 'argon2';
import { pool } from './database/connection.js';

const DEMO_ACCOUNTS = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'password',
    role: 'ADMIN',
    displayName: 'Mika Global Admin',
    balance: 5000000,
    parentId: null,
    commissionRate: 100,
    createdAt: '2026-01-01T00:00:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251911223344',
    cbeAccount: '1000123456789'
  },
  {
    id: 'sa-1',
    username: 'super_vortex',
    password: 'password',
    role: 'SUPER_AGENT',
    displayName: 'Vortex Elite Distribution',
    balance: 350000,
    parentId: 'admin-1',
    commissionRate: 85,
    createdAt: '2026-02-15T12:00:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251912345678',
    cbeAccount: '1000987654321'
  },
  {
    id: 'sa-2',
    username: 'super_apex',
    password: 'password',
    role: 'SUPER_AGENT',
    displayName: 'Apex Global Network',
    balance: 200000,
    parentId: 'admin-1',
    commissionRate: 80,
    createdAt: '2026-03-01T09:30:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251923456789',
    cbeAccount: '1000876543210'
  },
  {
    id: 'ag-1',
    username: 'agent_ares',
    password: 'password',
    role: 'AGENT',
    displayName: 'Ares Sports Club',
    balance: 95000,
    parentId: 'sa-1',
    commissionRate: 70,
    createdAt: '2026-02-20T14:45:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251934567890',
    cbeAccount: '1000765432109'
  },
  {
    id: 'ag-2',
    username: 'agent_zeus',
    password: 'password',
    role: 'AGENT',
    displayName: 'Zeus Betting Lounge',
    balance: 50000,
    parentId: 'sa-1',
    commissionRate: 65,
    createdAt: '2026-03-10T11:20:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251945678901',
    cbeAccount: '1000654321098'
  },
  {
    id: 'ag-3',
    username: 'agent_titan',
    password: 'password',
    role: 'AGENT',
    displayName: 'Titan VIP Slot Club',
    balance: 90000,
    parentId: 'sa-2',
    commissionRate: 72,
    createdAt: '2026-03-12T16:00:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251956789012',
    cbeAccount: '1000543210987'
  },
  {
    id: 'pl-1',
    username: 'lucky_spin',
    password: 'password',
    role: 'PLAYER',
    displayName: 'James R. (Lucky Spin)',
    balance: 3500,
    parentId: 'ag-1',
    commissionRate: 0,
    createdAt: '2026-03-15T18:30:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251967890123',
    cbeAccount: '1000432109876'
  },
  {
    id: 'pl-2',
    username: 'high_roller',
    password: 'password',
    role: 'PLAYER',
    displayName: 'Sophia K. (VIP Elite)',
    balance: 15000,
    parentId: 'ag-3',
    commissionRate: 0,
    createdAt: '2026-03-18T10:15:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251978901234',
    cbeAccount: '1000321098765'
  },
  {
    id: 'pl-3',
    username: 'crash_master',
    password: 'password',
    role: 'PLAYER',
    displayName: 'Erick L. (Crash Pro)',
    balance: 2100,
    parentId: 'ag-2',
    commissionRate: 0,
    createdAt: '2026-03-20T22:00:00Z',
    status: 'ACTIVE',
    phoneNumber: '+251989012345',
    cbeAccount: '1000210987654'
  }
];

async function runSeed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const usersCount = Number((await client.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n);
    if (usersCount === 0) {
      console.log('Seeding demo accounts to PostgreSQL...');
      const idMap = new Map<string, string>();
      const passwordHash = await argon2.hash('password', {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1
      });

      for (const a of DEMO_ACCOUNTS) {
        const parentUuid = a.parentId ? idMap.get(a.parentId) : null;
        const res = await client.query(
          `INSERT INTO users (username, display_name, password_hash, role, status, parent_id, phone_number, cbe_account, commission_rate, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            a.username,
            a.displayName,
            passwordHash,
            a.role,
            a.status,
            parentUuid,
            a.phoneNumber,
            a.cbeAccount,
            a.commissionRate,
            a.createdAt
          ]
        );
        const uuid = res.rows[0].id;
        idMap.set(a.id, uuid);

        await client.query(
          `INSERT INTO wallets (user_id, currency, balance_minor, updated_at)
           VALUES ($1, 'ETB', $2, now())`,
          [uuid, Math.round(a.balance * 100)]
        );
      }
      console.log(`✅ Successfully seeded ${DEMO_ACCOUNTS.length} users and wallets into PostgreSQL.`);
    } else {
      console.log(`ℹ️ Skipping seed: users table already has ${usersCount} rows.`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed execution error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed().catch((err) => {
  console.error('Fatal seed failure:', err);
  process.exit(1);
});
