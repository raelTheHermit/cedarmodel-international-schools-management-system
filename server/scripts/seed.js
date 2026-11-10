import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
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
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('Database environment variables are not configured. Check your .env file.');
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT ?? 3306),
    user: DB_USER,
    password: DB_PASSWORD ?? '',
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    const connection = await pool.getConnection();

    await connection.query('DELETE FROM login_attempts');
    await connection.query('DELETE FROM access_codes');
    await connection.query('DELETE FROM result_rows');
    await connection.query('DELETE FROM result_batches');
    await connection.query('DELETE FROM audit_log');
    await connection.query('DELETE FROM students');
    await connection.query('DELETE FROM staff_users');
    await connection.query('DELETE FROM terms');
    await connection.query('DELETE FROM classes');

    const insertedClasses = [];
    for (const name of classNames) {
      const [result] = await connection.query('INSERT INTO classes (name) VALUES (?)', [name]);
      insertedClasses.push({ id: Number(result.insertId), name });
    }

    const [termResult] = await connection.query('INSERT INTO terms (name, is_current) VALUES (?, 1)', ['2026/2027 Term 1']);
    const termId = Number(termResult.insertId);

    const studentRows = [];
    for (let index = 0; index < 40; index += 1) {
      const className = insertedClasses[index % insertedClasses.length];
      const firstName = firstNames[index % firstNames.length];
      const lastName = lastNames[index % lastNames.length];
      const phonePrefix = phonePrefixes[index % phonePrefixes.length];
      const phoneNumber = `${phonePrefix}${String(700000000 + index).slice(0, 8)}`;

      studentRows.push([
        `ADM-${String(index + 1).padStart(4, '0')}`,
        firstName,
        lastName,
        className.id,
        phoneNumber,
        1,
      ]);
    }

    if (studentRows.length > 0) {
      await connection.query(
        'INSERT INTO students (admission_number, first_name, last_name, class_id, parent_phone, active) VALUES ?',
        [studentRows],
      );
    }

    const [studentList] = await connection.query('SELECT id, admission_number FROM students ORDER BY id ASC');

    for (const student of studentList) {
      const accessCode = generateAccessCode();
      const hash = bcrypt.hashSync(accessCode, 10);
      await connection.query(
        'INSERT INTO access_codes (student_id, code_hash) VALUES (?, ?)',
        [student.id, hash],
      );
    }

    await connection.query(
      'INSERT INTO staff_users (email, password_hash, role, active) VALUES (?, ?, ?, 1), (?, ?, ?, 1)',
      [
        'admin@cedarmodel.local',
        bcrypt.hashSync('Admin123!', 10),
        'administrator',
        'principal@cedarmodel.local',
        bcrypt.hashSync('Principal123!', 10),
        'principal',
      ],
    );

    console.log(`Seeded ${insertedClasses.length} classes, 1 term (${termId}), and 40 students.`);
    console.log('Seeded 2 staff users with hashed passwords.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
