/**
 * Creates the database, applies schema.sql, then loads seed.sql.
 *
 * Uses the mysql2 driver rather than the `mysql` CLI so it works without
 * XAMPP's bin directory being on PATH.
 *
 *   npm run db:setup
 *   npm run db:setup -- --schema-only
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const here = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(here, '..', '..', 'database');

const schemaOnly = process.argv.includes('--schema-only');

const connectionConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  // schema.sql issues CREATE DATABASE / USE itself, so no database is
  // selected here. Required for running multi-statement SQL files.
  multipleStatements: true,
};

async function run() {
  let connection;

  try {
    connection = await mysql.createConnection(connectionConfig);
  } catch (error) {
    console.error('\n✖ Could not connect to MariaDB.');
    console.error(`  ${error.message}\n`);
    console.error('  Check that MySQL is started in the XAMPP Control Panel,');
    console.error(`  and that backend/.env matches (host ${connectionConfig.host}:${connectionConfig.port}, user ${connectionConfig.user}).\n`);
    process.exit(1);
  }

  try {
    await applyFile(connection, 'schema.sql');

    if (schemaOnly) {
      console.log('\n✔ Schema applied. Skipping seed (--schema-only).\n');
      return;
    }

    await applyFile(connection, 'seed.sql');
    await report(connection);
  } catch (error) {
    console.error(`\n✖ ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

async function applyFile(connection, filename) {
  const path = resolve(databaseDir, filename);
  const sql = await readFile(path, 'utf8');
  process.stdout.write(`→ applying ${filename} … `);
  await connection.query(sql);
  console.log('done');
}

async function report(connection) {
  const database = process.env.DB_NAME ?? 'aertoit';
  await connection.changeUser({ database });

  const tables = [
    ['services', 6],
    ['blog_posts', 8],
    ['testimonials', 6],
    ['faqs', 5],
    ['certifications', 5],
    ['job_postings', 4],
    ['stats', 3],
    ['site_settings', null],
    ['projects', null],
  ];

  console.log('\n  table              rows   expected');
  console.log('  ---------------------------------');

  let mismatch = false;
  for (const [table, expected] of tables) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    const count = rows[0].n;
    const ok = expected === null || count === expected;
    if (!ok) mismatch = true;
    console.log(
      `  ${table.padEnd(18)} ${String(count).padStart(4)}   ${
        expected === null ? '—' : String(expected).padStart(4)
      } ${ok ? '' : '  ← MISMATCH'}`,
    );
  }

  console.log(
    mismatch
      ? '\n✖ Seed row counts do not match. Check seed.sql for errors.\n'
      : `\n✔ Database "${database}" ready.\n`,
  );
  if (mismatch) process.exitCode = 1;
}

await run();
