import 'dotenv/config';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),

  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required('DB_USER', 'root'),
    // XAMPP's MariaDB ships with an empty root password by default.
    password: process.env.DB_PASSWORD ?? '',
    database: required('DB_NAME', 'aertoit'),
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
    /**
     * TLS to the database. Off locally, on for anything managed.
     *
     * Every hosted MySQL — Aiven, TiDB Cloud, Clever Cloud — refuses a
     * plaintext connection, so without this the app cannot reach any of them.
     * Set `DB_SSL=true` for a provider whose certificate chains to a public
     * root; set `DB_SSL_CA` to the PEM contents when it ships its own CA.
     */
    ssl: process.env.DB_SSL === 'true',
    sslCa: process.env.DB_SSL_CA ?? '',
  },

  /** Origins allowed to call the API. The Angular dev server runs on 4200. */
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:4200,http://localhost:4000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  uploads: {
    dir: process.env.UPLOAD_DIR ?? './uploads',
    maxBytes: Number(process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024),
  },
} as const;

export const isProduction = config.env === 'production';
