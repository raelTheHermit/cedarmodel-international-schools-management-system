const fs = require('node:fs/promises');
const path = require('node:path');
const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const migrationDir = path.resolve(__dirname, '../migrations');

function buildConnection(env = process.env) {
  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    const requireSsl = url.searchParams.get('sslmode') === 'require' || env.DB_SSL === 'true';
    url.searchParams.delete('sslmode');
    return { connectionString: url.toString(), ssl: requireSsl ? { rejectUnauthorized: false } : undefined };
  }

  const host = env.DB_HOST ?? env.PGHOST;
  const user = env.DB_USER ?? env.PGUSER;
  const database = env.DB_NAME ?? env.PGDATABASE;
  if (!host || !user || !database) {
    throw new Error('Database environment variables are not configured. Check your .env file.');
  }

  return {
    host,
    port: Number(env.DB_PORT ?? env.PGPORT ?? 5432),
    user,
    password: env.DB_PASSWORD ?? env.PGPASSWORD ?? '',
    database,
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  // `npm run migrate -- --baseline` records the original numbered migrations as
  // already applied WITHOUT running them. Keep dated migrations pending so they
  // can be applied normally on an existing database after it is baselined.
  const baseline = process.argv.includes('--baseline');

  const client = new pg.Client(buildConnection());
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Stop two deploys migrating at once.
    await client.query('SELECT pg_advisory_lock(727274)');

    const applied = new Set(
      (await client.query('SELECT filename FROM schema_migrations')).rows.map((row) => row.filename),
    );

    const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      if (baseline) {
        if (!/^\d{3}_.*\.sql$/.test(file)) continue;
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        console.log(`Baselined (not executed): ${file}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');

      try {
        await client.query('BEGIN');
        // No params => simple query protocol, so a whole multi-statement file runs as-is.
        // This handles $$ bodies and comments correctly, unlike manual splitting.
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed and was rolled back: ${error.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
