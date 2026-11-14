import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const classNames = [
  'Nursery 1',
  'Nursery 2',
  'Primary 1',
  'Primary 2',
  'Primary 3',
  'Primary 4',
  'Primary 5',
  'Primary 6',
  'JSS 1',
  'JSS 2',
  'SSS 1',
];

const firstNames = [
  'Aisha', 'Daniel', 'Faith', 'Chinonso', 'Grace', 'Ife', 'Musa', 'Ruth', 'Emmanuel', 'Tolu',
  'Binta', 'John', 'Mary', 'Kelechi', 'Abiola', 'Joseph', 'Esther', 'Olu', 'Precious', 'Victor',
  'Ada', 'Yusuf', 'Comfort', 'Nneka', 'Samuel', 'Blessing', 'David', 'Rebecca', 'Efe', 'Mariam',
  'Femi', 'Helen', 'Akintunde', 'Zainab', 'Michael', 'Dorcas', 'Tobi', 'Ngozi', 'Peter', 'Sandra'
];

const lastNames = [
  'Adebayo', 'Okafor', 'Johnson', 'Ali', 'Eze', 'Balogun', 'Uche', 'Ibrahim', 'Musa', 'Adeyemi',
  'Obi', 'Brown', 'Smith', 'Chukwu', 'Sanni', 'Nwofor', 'Akin', 'Bello', 'Tayo', 'Onyeka'
];

const phonePrefixes = ['080', '081', '090', '070'];

function generateAccessCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
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

  const pool = new pg.Pool({
    host,
    port: Number(DB_PORT ?? PGPORT ?? 5432),
    user,
    password,
    database,
  });

  try {
    const client = await pool.connect();

    try {
      await client.query('DELETE FROM login_attempts');
      await client.query('DELETE FROM access_codes');
      await client.query('DELETE FROM result_rows');
      await client.query('DELETE FROM result_batches');
      await client.query('DELETE FROM audit_log');
      await client.query('DELETE FROM students');
      await client.query('DELETE FROM staff_users');
      await client.query('DELETE FROM terms');
      await client.query('DELETE FROM classes');

      const insertedClasses = [];
      for (const name of classNames) {
        const result = await client.query('INSERT INTO classes (name) VALUES ($1) RETURNING id', [name]);
        insertedClasses.push({ id: Number(result.rows[0].id), name });
      }

      const termResult = await client.query('INSERT INTO terms (name, is_current) VALUES ($1, true) RETURNING id', ['2026/2027 Term 1']);
      const termId = Number(termResult.rows[0].id);

      for (let index = 0; index < 40; index += 1) {
        const className = insertedClasses[index % insertedClasses.length];
        const firstName = firstNames[index % firstNames.length];
        const lastName = lastNames[index % lastNames.length];
        const phonePrefix = phonePrefixes[index % phonePrefixes.length];
        const phoneNumber = `${phonePrefix}${String(700000000 + index).slice(0, 8)}`;

        await client.query(
          'INSERT INTO students (admission_number, first_name, last_name, class_id, parent_phone, active) VALUES ($1, $2, $3, $4, $5, true)',
          [
            `ADM-${String(index + 1).padStart(4, '0')}`,
            firstName,
            lastName,
            className.id,
            phoneNumber,
          ],
        );
      }

      const studentList = await client.query('SELECT id, admission_number FROM students ORDER BY id ASC');

      for (const student of studentList.rows) {
        const accessCode = generateAccessCode();
        const hash = bcrypt.hashSync(accessCode, 10);
        await client.query(
          'INSERT INTO access_codes (student_id, code_hash) VALUES ($1, $2)',
          [student.id, hash],
        );
      }

      await client.query(
        'INSERT INTO staff_users (email, password_hash, role, active) VALUES ($1, $2, $3, true), ($4, $5, $6, true), ($7, $8, $9, true)',
        [
          'viceprincipal@cedarmodel.local',
          bcrypt.hashSync('VicePrincipal123!', 10),
          'superadmin',
          'administrator@cedarmodel.local',
          bcrypt.hashSync('SchoolAdmin123!', 10),
          'superadmin',
          'developer@cedarmodel.local',
          bcrypt.hashSync('Developer123!', 10),
          'superadmin',
        ],
      );

      console.log(`Seeded ${insertedClasses.length} classes, 1 term (${termId}), and 40 students.`);
      console.log('Seeded 3 superadmin staff users with hashed passwords.');
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
