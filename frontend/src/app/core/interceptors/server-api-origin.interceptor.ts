import type { HttpInterceptorFn } from '@angular/common/http';

/**
 * Rewrites relative API URLs to absolute ones while rendering on the server.
 *
 * The production build calls a relative `/api`, which is correct in the
 * browser: the site and the API sit on one origin behind a reverse proxy, so
 * requests stay same-origin and no CORS is involved.
 *
 * Node's fetch has no notion of "current page", so the same relative URL
 * cannot be resolved during SSR or prerendering — every data fetch throws and
 * pages render empty. This prefixes those requests with a real origin so the
 * server can reach the API directly, bypassing the proxy hop.
 *
 * Registered only in app.config.server.ts, so it never ships to the browser.
 */
export const serverApiOriginInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/')) {
    return next(req);
  }

  const origin = process.env['API_ORIGIN'] ?? 'http://localhost:3000';
  return next(req.clone({ url: `${origin.replace(/\/$/, '')}${req.url}` }));
};
