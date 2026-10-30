import pg from 'pg';
import { config, isProduction } from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isProduction ? { rejectUnauthorized: true } : undefined
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});
