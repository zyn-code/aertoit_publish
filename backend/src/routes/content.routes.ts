import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { query, queryOne } from '../db/pool.js';
import { asyncRoute, notFound } from '../middleware/index.js';

export const contentRouter: Router = Router();

/* ------------------------------------------------------------------ */
/* settings                                                            */
/* ------------------------------------------------------------------ */

interface SettingRow extends RowDataPacket {
  setting_key: string;
  value: string;
  group_name: string;
}

/**
 * Returns settings as a flat key/value object. The front end reads the
 * contact email from here rather than hard-coding it — the live site's
 * `.com`/`.fr` mismatch came from having the address in two places.
 */
contentRouter.get(
  '/settings',
  asyncRoute(async (_req, res) => {
    const rows = await query<SettingRow>(
      'SELECT `setting_key`, `value`, `group_name` FROM `site_settings`',
    );
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.setting_key] = row.value;
    res.json(settings);
  }),
);

/* ------------------------------------------------------------------ */
/* services                                                            */
/* ------------------------------------------------------------------ */

interface ServiceRow extends RowDataPacket {
  id: number;
  /** Null for a top-level service; set for the nine sub-services. */
  parent_id: number | null;
  /** Rotator list; null on pages that do not run one. */
  communes: string[] | null;
  slug: string;
  name: string;
  h1: string;
  card_title: string;
  card_excerpt: string;
  intro: string;
  body: string | null;
  icon: string | null;
  hero_image: string | null;
  hero_image_alt: string | null;
  meta_title: string;
  meta_description: string;
  sort_order: number;
  /** Header pill this top-level service belongs to; null on children. */
  nav_group: string | null;
  /** Left-to-right rank of that pill. */
  nav_group_order: number | null;
}

const SERVICE_FIELDS = `
  id, parent_id, slug, name, h1, card_title, card_excerpt, intro, communes, body,
  icon, hero_image, hero_image_alt, meta_title, meta_description, sort_order, nav_group, nav_group_order`;

/**
 * MariaDB implements JSON as LONGTEXT, so the driver hands back a string
 * rather than a parsed value — unlike MySQL 8, where mysql2 parses it. Left
 * alone it reaches the client as a JSON-encoded string and any `.map()` on
 * it throws. Normalised here so every caller sees an array.
 */
function withParsedCommunes<T extends { communes: unknown }>(row: T): T {
  const raw = row.communes;
  if (typeof raw !== 'string') return row;
  try {
    const parsed: unknown = JSON.parse(raw);
    return { ...row, communes: Array.isArray(parsed) ? parsed : null };
  } catch {
    return { ...row, communes: null };
  }
}

/**
 * Top-level services, each with its children nested.
 *
 * The live site has a two-level structure — Couverture splits into tuiles,
 * ardoises and bac acier; Isolation into five insulation types — which drives
 * both the header dropdown and the sub-pages. Pass `?flat=1` for a plain list
 * (used by the sitemap and prerender slug lookup).
 */
contentRouter.get(
  '/services',
  asyncRoute(async (req, res) => {
    const rows = await query<ServiceRow & { parent_id: number | null }>(
      `SELECT ${SERVICE_FIELDS} FROM \`services\`
       WHERE \`is_published\` = TRUE
       ORDER BY \`parent_id\` IS NOT NULL, \`sort_order\` ASC`,
    );

    if (req.query['flat'] === '1') {
      res.json(rows.map(withParsedCommunes));
      return;
    }

    const parents = rows.filter((r) => r.parent_id === null);
    const byParent = new Map<number, ServiceRow[]>();
    for (const row of rows) {
      if (row.parent_id === null) continue;
      const list = byParent.get(row.parent_id) ?? [];
      list.push(row);
      byParent.set(row.parent_id, list);
    }

    res.json(
      parents.map((p) => ({
        ...withParsedCommunes(p),
        children: (byParent.get(p.id) ?? []).map(withParsedCommunes),
      })),
    );
  }),
);

contentRouter.get(
  '/services/:slug',
  asyncRoute(async (req, res) => {
    const row = await queryOne<ServiceRow>(
      `SELECT ${SERVICE_FIELDS} FROM \`services\`
       WHERE \`slug\` = ? AND \`is_published\` = TRUE`,
      [routeParam(req.params['slug'])],
    );
    if (!row) throw notFound('Service');
    res.json(withParsedCommunes(row));
  }),
);

/* ------------------------------------------------------------------ */
/* editorial pages                                                     */
/* ------------------------------------------------------------------ */

contentRouter.get(
  '/pages/:slug',
  asyncRoute(async (req, res) => {
    const row = await queryOne<RowDataPacket>(
      `SELECT id, slug, h1, intro, body, hero_image, hero_image_alt,
              meta_title, meta_description, updated_at
       FROM \`pages\`
       WHERE \`slug\` = ? AND \`is_published\` = TRUE`,
      [routeParam(req.params['slug'])],
    );
    if (!row) throw notFound('Page');
    res.json(row);
  }),
);

/**
 * Structured blocks for an editorial page — the values and the team roster
 * on à-propos. `kind` groups them into a band.
 */
contentRouter.get(
  '/pages/:slug/blocks',
  asyncRoute(async (req, res) => {
    const rows = await query<RowDataPacket>(
      `SELECT id, kind, title, text, icon, sort_order
       FROM \`page_blocks\`
       WHERE \`page_slug\` = ? AND \`is_published\` = TRUE
       ORDER BY \`kind\` ASC, \`sort_order\` ASC`,
      [routeParam(req.params['slug'])],
    );
    res.json(rows);
  }),
);

/* ------------------------------------------------------------------ */
/* testimonials, certifications, faqs                                 */
/* ------------------------------------------------------------------ */

contentRouter.get(
  '/testimonials',
  asyncRoute(async (_req, res) => {
    const rows = await query<RowDataPacket>(
      `SELECT id, author, author_role, headline, body, rating, google_url
       FROM \`testimonials\`
       WHERE \`is_published\` = TRUE
       ORDER BY \`sort_order\` ASC`,
    );
    res.json(rows);
  }),
);

contentRouter.get(
  '/certifications',
  asyncRoute(async (_req, res) => {
    const rows = await query<RowDataPacket>(
      `SELECT id, name, description, logo, logo_alt, url
       FROM \`certifications\`
       WHERE \`is_published\` = TRUE
       ORDER BY \`sort_order\` ASC`,
    );
    res.json(rows);
  }),
);

/** Photographs for the homepage hero panel, in display order. */
contentRouter.get(
  '/hero-slides',
  asyncRoute(async (_req, res) => {
    const rows = await query<RowDataPacket>(
      `SELECT id, image, image_alt
       FROM \`hero_slides\`
       WHERE \`is_published\` = TRUE
       ORDER BY \`sort_order\` ASC`,
    );
    res.json(rows);
  }),
);

contentRouter.get(
  '/faqs',
  asyncRoute(async (req, res) => {
    const scope = typeof req.query['scope'] === 'string' ? req.query['scope'] : 'global';
    const rows = await query<RowDataPacket>(
      `SELECT id, question, answer, scope
       FROM \`faqs\`
       WHERE \`is_published\` = TRUE AND \`scope\` = ?
       ORDER BY \`sort_order\` ASC`,
      [scope],
    );
    res.json(rows);
  }),
);

/* ------------------------------------------------------------------ */
/* blog                                                                */
/* ------------------------------------------------------------------ */

contentRouter.get(
  '/blog',
  asyncRoute(async (req, res) => {
    // LIMIT/OFFSET are interpolated, not bound: MySQL prepared statements
    // reject placeholders there. Both are clamped to safe integers first.
    const limit = clampInt(req.query['limit'], 12, 1, 50);
    const page = clampInt(req.query['page'], 1, 1, 1000);
    const offset = (page - 1) * limit;

    const rows = await query<RowDataPacket>(
      `SELECT id, slug, title, excerpt, cover_image, cover_image_alt, author, published_at
       FROM \`blog_posts\`
       WHERE \`is_published\` = TRUE AND \`published_at\` <= NOW()
       ORDER BY \`published_at\` DESC
       LIMIT ${limit} OFFSET ${offset}`,
    );

    const countRow = await queryOne<RowDataPacket>(
      'SELECT COUNT(*) AS total FROM `blog_posts` WHERE `is_published` = TRUE AND `published_at` <= NOW()',
    );
    const total = Number(countRow?.['total'] ?? 0);

    res.json({ items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
  }),
);

contentRouter.get(
  '/blog/:slug',
  asyncRoute(async (req, res) => {
    const row = await queryOne<RowDataPacket>(
      `SELECT id, slug, title, excerpt, body, cover_image, cover_image_alt,
              author, meta_title, meta_description, published_at, updated_at
       FROM \`blog_posts\`
       WHERE \`slug\` = ? AND \`is_published\` = TRUE AND \`published_at\` <= NOW()`,
      [routeParam(req.params['slug'])],
    );
    if (!row) throw notFound('Article');
    res.json(row);
  }),
);

/* ------------------------------------------------------------------ */
/* projects (réalisations)                                             */
/* ------------------------------------------------------------------ */

contentRouter.get(
  '/projects',
  asyncRoute(async (req, res) => {
    const serviceSlug = typeof req.query['service'] === 'string' ? req.query['service'] : null;

    const rows = await query<RowDataPacket>(
      `SELECT p.id, p.slug, p.title, p.commune, p.postal_code, p.year, p.summary,
              p.image_before, p.image_before_alt, p.image_after, p.image_after_alt,
              s.slug AS service_slug, s.name AS service_name
       FROM \`projects\` p
       LEFT JOIN \`services\` s ON s.id = p.service_id
       WHERE p.\`is_published\` = TRUE
         AND (? IS NULL OR s.\`slug\` = ?)
       ORDER BY p.\`sort_order\` ASC`,
      [serviceSlug, serviceSlug],
    );
    res.json(rows);
  }),
);

contentRouter.get(
  '/projects/:slug',
  asyncRoute(async (req, res) => {
    const row = await queryOne<RowDataPacket>(
      `SELECT p.*, s.slug AS service_slug, s.name AS service_name
       FROM \`projects\` p
       LEFT JOIN \`services\` s ON s.id = p.service_id
       WHERE p.\`slug\` = ? AND p.\`is_published\` = TRUE`,
      [routeParam(req.params['slug'])],
    );
    if (!row) throw notFound('Réalisation');
    res.json(row);
  }),
);

/* ------------------------------------------------------------------ */
/* careers                                                             */
/* ------------------------------------------------------------------ */

contentRouter.get(
  '/careers',
  asyncRoute(async (_req, res) => {
    const rows = await query<RowDataPacket>(
      `SELECT id, slug, title, contract_type, location, summary
       FROM \`job_postings\`
       WHERE \`is_open\` = TRUE
       ORDER BY \`sort_order\` ASC`,
    );
    res.json(rows);
  }),
);

contentRouter.get(
  '/careers/:slug',
  asyncRoute(async (req, res) => {
    const row = await queryOne<RowDataPacket>(
      `SELECT id, slug, title, contract_type, location, summary, body,
              meta_title, meta_description
       FROM \`job_postings\`
       WHERE \`slug\` = ? AND \`is_open\` = TRUE`,
      [routeParam(req.params['slug'])],
    );
    if (!row) throw notFound('Offre');
    res.json(row);
  }),
);

/* ------------------------------------------------------------------ */

/** Express types route params as `string | string[] | undefined`; we only ever want a string. */
function routeParam(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
