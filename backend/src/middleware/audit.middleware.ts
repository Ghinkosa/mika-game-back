import type { Request } from 'express';
import { pool } from '../database/connection.js';

export async function audit(
  req: Request,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await pool.query(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        req.session?.userId ?? null,
        action,
        targetType ?? null,
        targetId ?? null,
        req.ip || null,
        req.get('user-agent')?.slice(0, 500) ?? null,
        JSON.stringify(metadata)
      ]
    );
  } catch (err: any) {
    console.error('Audit event write failure:', err.message);
  }
}
