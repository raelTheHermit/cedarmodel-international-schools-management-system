import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { getDatabaseConfig } from './database-config.js';

let pool: Pool | null = null;

/** One shared pool per server instance. Keep it small: serverless instances multiply. */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ ...getDatabaseConfig(), max: Number(process.env.DB_POOL_MAX ?? 5) });
  }
  return pool;
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
