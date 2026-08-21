import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { ZodError, type ZodType } from 'zod';
import { isProduction } from '../config.js';

/** Error carrying an HTTP status, so routes can throw instead of branching. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (resource = 'Ressource') => new HttpError(404, `${resource} introuvable.`);

/**
 * Validates `req.body` against a schema and replaces it with the parsed
 * result, so downstream handlers receive trimmed, typed data.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new HttpError(422, 'Certains champs sont invalides.', fieldErrors(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Flattens a ZodError into `{ fieldName: firstMessage }` for the UI. */
function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    out[key] ??= issue.message;
  }
  return out;
}

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncRoute<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req as T, res, next).catch(next);
  };
}

/**
 * Write protection is two-tier on purpose.
 *
 * A single "5 requests per 15 minutes" rule counts validation failures, so a
 * genuine visitor who mistypes their phone number, forgets the consent box
 * and corrects a typo would be locked out of the quote form — on the page
 * the whole site exists to convert. Splitting it keeps both properties:
 */

/** Tier 1 — anti-hammering. Counts every attempt, generous enough to absorb form fumbles. */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Trop de tentatives depuis cet appareil. Merci de réessayer dans quelques minutes.',
  },
});

/** Tier 2 — anti-spam. Only *accepted* submissions count, so honest retries are free. */
export const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipFailedRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Trop de demandes envoyées. Merci de réessayer dans quelques minutes.',
  },
});

/**
 * Loopback callers are our own infrastructure, not visitors: the prerender
 * pass during `ng build` and the SSR server rendering a page on demand.
 *
 * Prerendering 28 routes fires well over a hundred reads in a few seconds,
 * which exhausted the old 120/min bucket and then 429'd the first real
 * browser to arrive. Both belong outside the visitor budget.
 *
 * Safe in production: `trust proxy` is enabled there, so `req.ip` resolves to
 * the forwarded client address and a genuine visitor never appears loopback.
 */
function isInternalCaller(req: Request): boolean {
  const ip = (req.ip ?? '').replace(/^::ffff:/, '');
  return ip === '127.0.0.1' || ip === '::1' || ip === '';
}

/**
 * Read endpoints: a backstop against scraping, not a throttle on browsing.
 *
 * A single page view costs up to ~7 reads, so 120/min allowed only about 17
 * views a minute from one address — trivially tripped by an office or mobile
 * carrier NAT where many people share an IP. 600 keeps that headroom while
 * still stopping a bulk crawl.
 */
export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  skip: isInternalCaller,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  console.error('[api] unhandled error:', err);
  res.status(500).json({
    error: 'Une erreur est survenue. Merci de réessayer.',
    // Never leak stack traces or driver messages in production.
    ...(isProduction ? {} : { debug: err instanceof Error ? err.message : String(err) }),
  });
}
