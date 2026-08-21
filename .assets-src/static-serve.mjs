/** Serves dist/browser as a dumb static host — no API, no SSR. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = '../frontend/dist/frontend/browser';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const candidates = [join(ROOT, url), join(ROOT, url, 'index.html'), join(ROOT, 'index.html')];
  for (const f of candidates) {
    try {
      if (!(await stat(f)).isFile()) continue;
      res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
      res.end(await readFile(f));
      return;
    } catch {}
  }
  res.writeHead(404).end('not found');
}).listen(4500, () => console.log('static host on 4500'));
