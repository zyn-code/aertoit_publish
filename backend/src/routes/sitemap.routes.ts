import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { query } from '../db/pool.js';
import { asyncRoute } from '../middleware/index.js';

export const sitemapRouter: Router = Router();

const SITE_URL = (process.env['SITE_URL'] ?? 'https://aertoit.fr').replace(/\/$/, '');

interface UrlEntry {
  loc: string;
  lastmod?: Date | string | null;
  changefreq: string;
  priority: string;
}

/**
 * Generated from the database rather than maintained by hand.
 *
 * The live site's sitemap omits three of its six service pages, which is
 * exactly the drift a hand-maintained list produces. Anything published
 * here appears automatically.
 */
sitemapRouter.get(
  '/sitemap.xml',
  asyncRoute(async (_req, res) => {
    const entries: UrlEntry[] = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.9' },
      // Services index. High priority: it is the hub every service page
      // hangs off, and the homepage's main services CTA points at it.
      { loc: '/nos-prestations', changefreq: 'monthly', priority: '0.9' },
      { loc: '/a-propos', changefreq: 'monthly', priority: '0.7' },
      { loc: '/realisations', changefreq: 'weekly', priority: '0.8' },
      { loc: '/blog', changefreq: 'weekly', priority: '0.7' },
      { loc: '/mentions-legales', changefreq: 'yearly', priority: '0.2' },
      { loc: '/politique-de-confidentialite', changefreq: 'yearly', priority: '0.2' },
    ];

    const services = await query<RowDataPacket>(
      'SELECT slug, updated_at FROM `services` WHERE `is_published` = TRUE ORDER BY sort_order',
    );
    for (const row of services) {
      entries.push({
        loc: `/service/${row['slug']}`,
        lastmod: row['updated_at'],
        changefreq: 'monthly',
        priority: '0.9',
      });
    }

    const projects = await query<RowDataPacket>(
      'SELECT slug, updated_at FROM `projects` WHERE `is_published` = TRUE ORDER BY sort_order',
    );
    for (const row of projects) {
      entries.push({
        loc: `/realisations/${row['slug']}`,
        lastmod: row['updated_at'],
        changefreq: 'yearly',
        priority: '0.6',
      });
    }

    const posts = await query<RowDataPacket>(
      `SELECT slug, updated_at FROM \`blog_posts\`
       WHERE \`is_published\` = TRUE AND \`published_at\` <= NOW()
       ORDER BY published_at DESC`,
    );
    for (const row of posts) {
      entries.push({
        loc: `/blog/${row['slug']}`,
        lastmod: row['updated_at'],
        changefreq: 'yearly',
        priority: '0.6',
      });
    }

    const jobs = await query<RowDataPacket>(
      'SELECT slug FROM `job_postings` WHERE `is_open` = TRUE ORDER BY sort_order',
    );
    for (const row of jobs) {
      entries.push({
        loc: `/carriere/${row['slug']}`,
        changefreq: 'monthly',
        priority: '0.5',
      });
    }

    res.type('application/xml').send(renderSitemap(entries));
  }),
);

/** robots.txt, pointing at the sitemap above. */
sitemapRouter.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n'),
  );
});

function renderSitemap(entries: readonly UrlEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = toIsoDate(entry.lastmod);
      return [
        '  <url>',
        `    <loc>${escapeXml(SITE_URL + entry.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
