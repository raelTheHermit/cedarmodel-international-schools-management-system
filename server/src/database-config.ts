import type { PoolConfig } from 'pg';

/** Build the same Render-compatible connection settings for the API and scripts. */
export function getDatabaseConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const databaseUrl = env.DATABASE_URL;
  const ssl = env.DB_SSL === 'true' || Boolean(databaseUrl?.includes('sslmode=require'))
    ? { rejectUnauthorized: false }
    : undefined;

  if (databaseUrl) {
    // Keep the URL hostname intact for TLS SNI, while handling TLS explicitly
    // through pg's SSL option.
    const url = new URL(databaseUrl);
    url.searchParams.delete('sslmode');
    return { connectionString: url.toString(), ssl };
  }

  const host = env.DB_HOST ?? env.PGHOST;
  const user = env.DB_USER ?? env.PGUSER;
  const database = env.DB_NAME ?? env.PGDATABASE;
  if (!host || !user || !database) {
    throw new Error('Database environment variables are not configured.');
  }

  return {
    host,
    port: Number(env.DB_PORT ?? env.PGPORT ?? 5432),
    user,
    password: env.DB_PASSWORD ?? env.PGPASSWORD ?? '',
    database,
    ssl,
  };
}
