const fs = require('node:fs/promises');
const path = require('node:path');
const pg = require('pg');
const dotenv = require('dotenv');

const scriptDir = __dirname;
dotenv.config({ path: path.resolve(scriptDir, '../../.env') });

const migrationDir = path.resolve(scriptDir, '../migrations');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null;
  let escape = false;

  for (const char of sql) {
    if (quote) {
      current += char;
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }

    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);

  return statements;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const host = process.env.DB_HOST ?? process.env.PGHOST;
  const user = process.env.DB_USER ?? process.env.PGUSER;
  const database = process.env.DB_NAME ?? process.env.PGDATABASE;
  if (!databaseUrl && (!host || !user || !database)) {
    throw new Error('Database environment variables are not configured. Check your .env file.');
  }

  const connection = databaseUrl
    ? (() => {
        const url = new URL(databaseUrl);
        const requireSsl = url.searchParams.get('sslmode') === 'require' || process.env.DB_SSL === 'true';
        url.searchParams.delete('sslmode');
        return { connectionString: url.toString(), ssl: requireSsl ? { rejectUnauthorized: false } : undefined };
      })()
    : {
        host,
        port: Number(process.env.DB_PORT ?? process.env.PGPORT ?? 5432),
        user,
        password: process.env.DB_PASSWORD ?? process.env.PGPASSWORD ?? '',
        database,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      };
  const client = new pg.Client(connection);

  await client.connect();

  try {
    const files = (await fs.readdir(migrationDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
      const statements = splitSqlStatements(sql);
      for (const statement of statements) {
        await client.query(statement);
      }
      console.log(`Applied migration: ${file}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
