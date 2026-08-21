import { Routes } from '@angular/router';

/**
 * Every marketing route is lazy-loaded and prerendered at build time.
 *
 * The six services live under a single `/service/:slug` pattern. The live
 * site splits them between root paths and `/service/*`, and leaves three of
 * them out of its sitemap; one pattern makes that impossible.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Aertoit Couverture — Couvreurs experts dans le Val-de-Marne',
  },
  {
    // Services index. The site had none: every service page was reachable
    // only from the header menu or its parent, and the homepage's
    // "see everything" action had nowhere to point.
    path: 'nos-prestations',
    loadComponent: () => import('./pages/services/services-index').then((m) => m.ServicesIndex),
    title: 'Nos prestations de toiture — Aertoit Couverture',
  },
  {
    path: 'service/:slug',
    loadComponent: () =>
      import('./pages/service-detail/service-detail').then((m) => m.ServiceDetail),
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'a-propos',
    loadComponent: () => import('./pages/a-propos/a-propos').then((m) => m.APropos),
  },

  // --- réalisations (new — webA has no project gallery) ----------------
  {
    path: 'realisations',
    loadComponent: () => import('./pages/realisations/realisations').then((m) => m.Realisations),
  },
  {
    path: 'realisations/:slug',
    loadComponent: () =>
      import('./pages/realisations/realisation-detail').then((m) => m.RealisationDetail),
  },

  // --- blog (new index — webA's /blog is a 404) ------------------------
  {
    path: 'blog',
    loadComponent: () => import('./pages/blog/blog-list').then((m) => m.BlogList),
  },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./pages/blog/blog-post').then((m) => m.BlogPostPage),
  },

  // --- recruitment -----------------------------------------------------
  {
    path: 'carriere/:slug',
    loadComponent: () => import('./pages/carriere/carriere-detail').then((m) => m.CarriereDetail),
  },

  // --- legal ---------------------------------------------------------
  // Both mandatory in France and both 404 on the live site.
  {
    path: 'mentions-legales',
    loadComponent: () => import('./pages/legal/mentions-legales').then((m) => m.MentionsLegales),
  },
  {
    path: 'politique-de-confidentialite',
    loadComponent: () =>
      import('./pages/legal/politique-confidentialite').then((m) => m.PolitiqueConfidentialite),
  },

  // --- legacy path redirects -----------------------------------------
  // The live site serves these three at the root. Preserve their inbound
  // links and rankings rather than dropping them.
  { path: 'couverture', redirectTo: 'service/couverture', pathMatch: 'full' },
  { path: 'isolation', redirectTo: 'service/isolation', pathMatch: 'full' },
  {
    path: 'fenetre-de-toit-velux',
    redirectTo: 'service/fenetre-de-toit-velux',
    pathMatch: 'full',
  },

  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
