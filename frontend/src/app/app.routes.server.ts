import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Prerender configuration.
 *
 * Parameterised routes get their slug list from the API at build time, so a
 * new service or article in the database becomes a static page on the next
 * build — no route list to keep in sync by hand.
 *
 * The API must therefore be running during `ng build`. If it is not, the
 * build still succeeds: the slug lookup returns an empty list, and
 * `PrerenderFallback.Server` means those URLs are server-rendered on demand
 * instead. Crawlers get complete HTML either way.
 */

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000/api';

interface SlugRow {
  slug: string;
}

async function fetchSlugs(endpoint: string): Promise<{ slug: string }[]> {
  try {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    // /blog returns { items: [...] }; the others return a bare array.
    const rows: unknown = Array.isArray(payload)
      ? payload
      : ((payload as { items?: unknown }).items ?? []);

    return (rows as SlugRow[])
      .filter((r) => typeof r?.slug === 'string')
      .map((r) => ({ slug: r.slug }));
  } catch (error) {
    console.warn(
      `[prerender] could not reach ${API_URL}/${endpoint} — ` +
        `these pages will be server-rendered on demand instead. ` +
        `Start the API before building to prerender them. ` +
        `(${error instanceof Error ? error.message : String(error)})`,
    );
    return [];
  }
}

export const serverRoutes: ServerRoute[] = [
  {
    path: 'service/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    // flat=1: the default response nests sub-services under their parent,
    // which would prerender only the six top-level pages and leave the nine
    // children to be rendered on demand.
    getPrerenderParams: () => fetchSlugs('services?flat=1'),
  },
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    getPrerenderParams: () => fetchSlugs('blog?limit=50'),
  },
  {
    path: 'realisations/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    getPrerenderParams: () => fetchSlugs('projects'),
  },
  {
    path: 'carriere/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    getPrerenderParams: () => fetchSlugs('careers'),
  },
  // Static pages, prerendered at build time.
  ...(
    [
      '',
      'contact',
      'a-propos',
      'nos-prestations',
      'realisations',
      'blog',
      'mentions-legales',
      'politique-de-confidentialite',
      // Legacy root paths kept as 301s for their inbound links.
      'couverture',
      'isolation',
      'fenetre-de-toit-velux',
    ] as const
  ).map((path) => ({ path, renderMode: RenderMode.Prerender }) satisfies ServerRoute),

  {
    // Everything else is server-rendered per request. That is what lets the
    // NotFound component set a real 404 status: a prerendered wildcard would
    // always answer 200, and Google treats those soft 404s as thin indexable
    // pages competing with the real ones.
    path: '**',
    renderMode: RenderMode.Server,
  },
];
