import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { readdirSync } from 'node:fs';
import { join, posix } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/**
 * Hosts the SSR engine will render for.
 *
 * Angular validates the incoming Host header to prevent SSRF. The failure
 * mode is the dangerous part: an unlisted host does not throw, it silently
 * falls back to client-side rendering. The server then answers HTTP 200 with
 * a ~3kB empty shell instead of the ~37kB prerendered page — invisible in a
 * browser, which hydrates and looks fine, but crawlers get a blank document
 * with no H1, no copy and no JSON-LD.
 *
 * Set before the engine is constructed, because it reads the value at
 * construction time. Override with NG_ALLOWED_HOSTS in other environments.
 */
process.env['NG_ALLOWED_HOSTS'] ??= 'aertoit.fr,www.aertoit.fr,localhost,127.0.0.1';

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Paths that correspond to a real page, derived from the prerendered output
 * at startup: every directory holding an index.html is a valid route.
 *
 * This exists so unknown URLs can answer a real HTTP 404. Angular's wildcard
 * route falls back to a client-render shell rather than server-rendering, so
 * the NotFound component never runs on the server and cannot set the status
 * itself — every dead link would otherwise return 200, and Google indexes
 * those soft 404s as thin pages competing with the real ones.
 *
 * Note: content added to the database after a build is not in this set (nor
 * in the sitemap) until the next build, which is when it would be prerendered.
 */
function collectPrerenderedPaths(dir: string, prefix = ''): Set<string> {
  const paths = new Set<string>();
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return paths;
  }

  for (const entry of entries) {
    if (entry.isFile() && entry.name === 'index.html') {
      paths.add(prefix === '' ? '/' : prefix);
    } else if (entry.isDirectory()) {
      for (const nested of collectPrerenderedPaths(
        join(dir, entry.name),
        posix.join(prefix, entry.name),
      )) {
        paths.add(nested.startsWith('/') ? nested : `/${nested}`);
      }
    }
  }
  return paths;
}

const validPaths = collectPrerenderedPaths(browserDistFolder);
console.log(`[ssr] ${validPaths.size} known routes`);

/** Requests for files (with an extension) are assets, not pages. */
const looksLikeAsset = (pathname: string): boolean => /\.[a-z0-9]+$/i.test(pathname);

function isKnownPage(pathname: string): boolean {
  const normalised =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return validPaths.has(normalised);
}

/**
 * Proxy /api, /sitemap.xml and /robots.txt to the Express backend.
 *
 * The production build calls a relative `/api`, on the assumption that a
 * reverse proxy puts the site and the API on one origin. Without an
 * equivalent here, a locally served build renders its prerendered HTML and
 * then blanks every data-driven list the moment it hydrates, because the
 * XHR goes to the SSR port instead of the API port.
 *
 * Proxying in-process keeps `npm start` a faithful rehearsal of production
 * and keeps the browser on a single origin, so no CORS is involved.
 */
const API_ORIGIN = process.env['API_ORIGIN'] ?? 'http://localhost:3000';

app.use(['/api', '/sitemap.xml', '/robots.txt'], async (req, res, next) => {
  const target = new URL(req.originalUrl, API_ORIGIN);

  // Forward the client's address so the API's rate limiter keys on the real
  // visitor rather than on the proxy itself.
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    // Hop-by-hop headers must not be forwarded; host must be recomputed.
    if (['host', 'connection', 'content-length'].includes(key)) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const forwardedFor = req.headers['x-forwarded-for'];
  headers.set(
    'x-forwarded-for',
    [forwardedFor, req.socket.remoteAddress].filter(Boolean).join(', '),
  );

  try {
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      // Cast: server.ts is compiled against the app's DOM lib, whose BodyInit
      // union omits ArrayBufferView even though the runtime accepts it.
      // Forwarding raw bytes (rather than a decoded string) keeps the proxy
      // correct for multipart CV uploads on /api/job-applications.
      body: hasBody ? ((await readRawBody(req)) as unknown as BodyInit) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key === 'content-encoding' || key === 'transfer-encoding') return;
      res.setHeader(key, value);
    });
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error(`[ssr] API proxy failed for ${req.originalUrl}:`, error);
    if (!res.headersSent) {
      res.status(502).json({ error: 'API indisponible.' });
    } else {
      next(error);
    }
  }
});

/**
 * Collects the raw request body; the proxy must forward bytes untouched.
 *
 * Returns a plain Uint8Array rather than a Buffer: fetch's BodyInit does not
 * accept Node's Buffer type. Bodies are capped at 100kB by the API, so the
 * copy is negligible.
 */
function readRawBody(req: express.Request): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Uint8Array.from(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}

/**
 * Legacy paths from the Framer site, issued as real 301s.
 *
 * These three services live at the root on the live site and carry its
 * existing inbound links and rankings. The router also declares client-side
 * redirects for in-app navigation, but those render as HTTP 200 — only a
 * true 301 tells search engines to transfer ranking to the new URL.
 */
const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  '/couverture': '/service/couverture',
  '/isolation': '/service/isolation',
  '/fenetre-de-toit-velux': '/service/fenetre-de-toit-velux',
};

app.get(Object.keys(LEGACY_REDIRECTS), (req, res) => {
  const target = LEGACY_REDIRECTS[req.path];
  if (target) {
    res.redirect(301, target);
    return;
  }
  res.status(404).end();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 *
 * A mutable context object is passed into the render. The NotFound component
 * sets `notFound` on it, and the status is rewritten to 404 here. Without
 * this every dead URL would answer 200 with a "page introuvable" body — a
 * soft 404, which Google indexes as a thin duplicate page.
 */
app.use((req, res, next) => {
  const pathname = req.path;

  // A request for a file that express.static did not serve is a missing
  // asset, not a route. Handing it to Angular would answer 200 with an HTML
  // body and `content-type: text/html` — so a mistyped font or image URL
  // looks like a success to the browser, gets cached, and the real failure
  // stays invisible.
  if (looksLikeAsset(pathname)) {
    res.status(404).type('text/plain').send('Not Found');
    return;
  }

  const unknownPage = !isKnownPage(pathname);

  angularApp
    .handle(req)
    .then((response) => {
      if (!response) {
        next();
        return;
      }

      // The body still renders the NotFound page client-side; what matters
      // for crawlers is that the status is honest.
      if (unknownPage && response.status === 200) {
        return writeResponseToNodeResponse(
          new Response(response.body, {
            status: 404,
            statusText: 'Not Found',
            headers: response.headers,
          }),
          res,
        );
      }

      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
