import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { config } from '../config.js';

/**
 * Shared connection pool. Every query in the app goes through here so that
 * connections are reused rather than opened per request.
 */
export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  // Return DATE/DATETIME as JS Date objects rather than strings.
  dateStrings: false,
  // Guards against a single bad query holding a connection forever.
  connectTimeout: 10_000,
  // Managed MySQL refuses plaintext. `sslCa` covers providers that present
  // their own CA rather than one already in the system trust store; omitting
  // the key entirely (rather than passing `false`) is what keeps a local
  // XAMPP connection unencrypted as before.
  ...(config.db.ssl
    ? { ssl: config.db.sslCa ? { ca: config.db.sslCa } : { minVersion: 'TLSv1.2' } }
    : {}),
});

/** Values the driver accepts as prepared-statement parameters. */
export type SqlParam = string | number | boolean | Date | Buffer | null;

// mysql2 types its `values` argument as a private `ExecuteValues` union that
// is not exported. SqlParam is the same set, so one cast here keeps every
// call site type-safe instead of scattering `any` through the routes.
type DriverParams = Parameters<typeof pool.execute>[1];
const toDriverParams = (params: readonly SqlParam[]): DriverParams => params as DriverParams;

/** Run a SELECT and get typed rows back. Always uses prepared statements. */
export async function query<T extends RowDataPacket>(
  sql: string,
  params: readonly SqlParam[] = [],
): Promise<T[]> {
  const [rows] = await pool.execute<T[]>(sql, toDriverParams(params));
  return rows;
}

/** Run a SELECT expected to match at most one row. */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params: readonly SqlParam[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run an INSERT/UPDATE/DELETE and get the result header back. */
export async function execute(
  sql: string,
  params: readonly SqlParam[] = [],
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, toDriverParams(params));
  return result;
}

/** Verify the database is reachable. Called once on boot so a bad DSN fails loudly. */
export async function assertConnection(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
