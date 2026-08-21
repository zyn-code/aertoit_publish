import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, isProduction } from './config.js';
import { assertConnection, closePool } from './db/pool.js';
import { contentRouter } from './routes/content.routes.js';
import { quotesRouter } from './routes/quotes.routes.js';
import { sitemapRouter } from './routes/sitemap.routes.js';
import { errorHandler, readLimiter, HttpError } from './middleware/index.js';

const app = express();

// Behind a reverse proxy in production, trust one hop so req.ip is the real
// client address — the rate limiter keys on it.
app.set('trust proxy', isProduction ? 1 : false);
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: false,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, env: config.env });
});

app.use('/api', readLimiter, contentRouter);
app.use('/api', quotesRouter);

// Served at the site root, not under /api — the reverse proxy maps
// aertoit.fr/sitemap.xml and /robots.txt straight through to these.
app.use('/', sitemapRouter);

app.use((_req, _res, next) => next(new HttpError(404, 'Endpoint introuvable.')));
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await assertConnection();
    console.log(`[api] connected to ${config.db.database}@${config.db.host}:${config.db.port}`);
  } catch (err) {
    console.error('[api] database unreachable — is MariaDB running in XAMPP?');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.log(`\n[api] ${signal} received, shutting down`);
      server.close(() => {
        void closePool().then(() => process.exit(0));
      });
    });
  }
}

void start();

export { app };
