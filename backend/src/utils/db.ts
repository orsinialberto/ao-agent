import { Pool } from 'pg';

declare global {
  var pool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const pool = globalThis.pool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== 'production') {
  globalThis.pool = pool;
}

export async function disconnect(): Promise<void> {
  await pool.end();
}

process.on('beforeExit', async () => {
  await pool.end();
});
