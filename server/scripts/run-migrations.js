import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const migrationDir = path.resolve(process.cwd(), 'migrations');

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
  const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE,
  } = process.env;

  const host = DB_HOST ?? PGHOST;
  const user = DB_USER ?? PGUSER;
  const password = DB_PASSWORD ?? PGPASSWORD ?? '';
  const database = DB_NAME ?? PGDATABASE;

  if (!host || !user || !database) {
    throw new Error('Database environment variables are not configured. Check your .env file.');
  }

  const client = new pg.Client({
    host,
    port: Number(DB_PORT ?? PGPORT ?? 5432),
    user,
    password,
    database,
  });

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
