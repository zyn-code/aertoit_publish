import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, queryOne } from '../db/pool.js';
import {
  asyncRoute,
  HttpError,
  submissionLimiter,
  validateBody,
  writeLimiter,
} from '../middleware/index.js';
import {
  jobApplicationSchema,
  quoteRequestSchema,
  type JobApplicationInput,
  type QuoteRequestInput,
} from '../schemas/quote.schema.js';

export const quotesRouter: Router = Router();

/**
 * POST /api/quote-requests — the site's primary conversion.
 *
 * Layers, in order: rate limit -> schema validation (which enforces the
 * RGPD consent literal) -> honeypot -> insert.
 */
quotesRouter.post(
  '/quote-requests',
  writeLimiter,
  submissionLimiter,
  validateBody(quoteRequestSchema),
  asyncRoute(async (req, res) => {
    const input = req.body as QuoteRequestInput;

    // Honeypot: a filled hidden field means a bot. Answer 202 rather than an
    // error so the script sees success and does not retry with variations.
    if (input.website) {
      res.status(202).json({ ok: true });
      return;
    }

    const service = await queryOne<RowDataPacket>(
      'SELECT `id` FROM `services` WHERE `slug` = ? AND `is_published` = TRUE',
      [input.serviceSlug],
    );
    if (!service) {
      throw new HttpError(422, 'Certains champs sont invalides.', {
        serviceSlug: 'Service inconnu.',
      });
    }

    const result = await execute(
      `INSERT INTO \`quote_requests\`
         (service_id, request_type, full_name, phone, email, commune, message,
          consent_given, source_page, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        service['id'],
        input.requestType,
        input.fullName,
        normalisePhone(input.phone),
        // A callback collects neither; the schema guarantees the full form did.
        input.email?.toLowerCase() ?? null,
        input.commune ?? null,
        input.message ?? null,
        input.consentGiven,
        input.sourcePage ?? null,
        clientIp(req.ip),
        req.get('user-agent')?.slice(0, 500) ?? null,
      ],
    );

    res.status(201).json({
      ok: true,
      id: result.insertId,
      message: 'Votre demande a bien été envoyée. Nous vous recontactons sous 48h.',
    });
  }),
);

/**
 * POST /api/job-applications — recruitment. CV upload is handled separately
 * in a later phase; this accepts the contact details today.
 */
quotesRouter.post(
  '/job-applications',
  writeLimiter,
  submissionLimiter,
  validateBody(jobApplicationSchema),
  asyncRoute(async (req, res) => {
    const input = req.body as JobApplicationInput;

    if (input.website) {
      res.status(202).json({ ok: true });
      return;
    }

    const job = await queryOne<RowDataPacket>(
      'SELECT `id` FROM `job_postings` WHERE `slug` = ? AND `is_open` = TRUE',
      [input.jobSlug],
    );
    if (!job) {
      throw new HttpError(422, 'Certains champs sont invalides.', {
        jobSlug: 'Offre inconnue ou clôturée.',
      });
    }

    const result = await execute(
      `INSERT INTO \`job_applications\`
         (job_posting_id, full_name, email, phone, message, consent_given, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        job['id'],
        input.fullName,
        input.email.toLowerCase(),
        normalisePhone(input.phone),
        input.message ?? null,
        input.consentGiven,
        clientIp(req.ip),
      ],
    );

    res.status(201).json({
      ok: true,
      id: result.insertId,
      message: 'Votre candidature a bien été envoyée. Merci de votre intérêt.',
    });
  }),
);

/** Strips separators so numbers are stored in one comparable shape. */
function normalisePhone(phone: string): string {
  return phone.replace(/[\s.\-()]/g, '');
}

/** Normalises IPv6-mapped IPv4 (::ffff:127.0.0.1) and caps length for the column. */
function clientIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return ip.replace(/^::ffff:/, '').slice(0, 45);
}
