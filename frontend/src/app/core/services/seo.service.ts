import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import type { Faq, SiteSettings } from '../models/api.models';

export interface PageSeo {
  title: string;
  description: string;
  /** Path only, e.g. '/service/couverture'. Combined with siteUrl. */
  path: string;
  image?: string;
  type?: 'website' | 'article';
  publishedAt?: string;
  modifiedAt?: string;
  /** Set true on pages that must not be indexed. */
  noIndex?: boolean;
}

/**
 * Owns every SEO side effect: title, meta, canonical, Open Graph and JSON-LD.
 *
 * Everything emitted here has to be true of the business. Structured data is
 * a machine-readable assertion, so a claim that cannot be substantiated is
 * not merely decorative — it is the one place a wrong number does real harm.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly LD_ID_PREFIX = 'ld-';

  apply(seo: PageSeo): void {
    const url = this.absolute(seo.path);

    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });

    this.meta.updateTag({
      name: 'robots',
      content: seo.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });

    this.setCanonical(url);

    this.meta.updateTag({ property: 'og:type', content: seo.type ?? 'website' });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:locale', content: 'fr_FR' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Aertoit Couverture' });
    if (seo.image) {
      this.meta.updateTag({ property: 'og:image', content: this.absolute(seo.image) });
    }

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    if (seo.image) {
      this.meta.updateTag({ name: 'twitter:image', content: this.absolute(seo.image) });
    }

    if (seo.type === 'article') {
      if (seo.publishedAt) {
        this.meta.updateTag({ property: 'article:published_time', content: seo.publishedAt });
      }
      if (seo.modifiedAt) {
        this.meta.updateTag({ property: 'article:modified_time', content: seo.modifiedAt });
      }
    }
  }

  /**
   * LocalBusiness markup for the NAP block.
   *
   * No `aggregateRating`. It was built from `rating_value` and
   * `review_count` — a 4.9 over 160 reviews that nothing in the supplied
   * content substantiates. Structured data is a claim made to a search
   * engine on the business's behalf, so an unverifiable rating is worse
   * there than on the page: it can earn a rich result the business cannot
   * support, and Google penalises exactly that.
   */
  setLocalBusiness(settings: SiteSettings): void {
    this.setJsonLd('business', {
      '@context': 'https://schema.org',
      '@type': 'RoofingContractor',
      '@id': `${environment.siteUrl}/#business`,
      name: settings.company_name,
      description:
        'Spécialiste des travaux de couverture depuis 2005, Aertoit est une référence en matière de couverture dans le Val-de-Marne.',
      url: environment.siteUrl,
      telephone: settings.phone_e164,
      email: settings.contact_email,
      foundingDate: settings.founded_year,
      address: {
        '@type': 'PostalAddress',
        streetAddress: settings.address_street,
        addressLocality: settings.address_locality,
        postalCode: settings.address_postal,
        addressRegion: settings.address_region,
        addressCountry: settings.address_country,
      },
      areaServed: { '@type': 'AdministrativeArea', name: settings.service_area },
      sameAs: [
        settings.social_linkedin,
        settings.social_facebook,
        settings.social_instagram,
        settings.social_tiktok,
      ].filter(Boolean),
    });
  }

  /** FAQPage markup. The site already renders the questions; this exposes them. */
  setFaqPage(faqs: readonly Faq[]): void {
    if (!faqs.length) {
      this.removeJsonLd('faq');
      return;
    }
    this.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: stripHtml(f.answer) },
      })),
    });
  }

  setBreadcrumbs(trail: readonly { label: string; path: string }[]): void {
    if (trail.length < 2) {
      this.removeJsonLd('breadcrumb');
      return;
    }
    this.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.label,
        item: this.absolute(item.path),
      })),
    });
  }

  setArticle(article: {
    title: string;
    description: string;
    path: string;
    image?: string;
    publishedAt: string;
    modifiedAt?: string;
    author: string;
  }): void {
    this.setJsonLd('article', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      mainEntityOfPage: { '@type': 'WebPage', '@id': this.absolute(article.path) },
      datePublished: article.publishedAt,
      dateModified: article.modifiedAt ?? article.publishedAt,
      author: { '@type': 'Organization', name: article.author },
      publisher: { '@type': 'Organization', name: 'Aertoit Couverture' },
      ...(article.image ? { image: this.absolute(article.image) } : {}),
    });
  }

  setService(service: { name: string; description: string; path: string }): void {
    this.setJsonLd('service', {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: service.name,
      description: service.description,
      url: this.absolute(service.path),
      provider: { '@id': `${environment.siteUrl}/#business` },
      areaServed: { '@type': 'AdministrativeArea', name: 'Val-de-Marne' },
    });
  }

  /** Clears page-scoped blocks when navigating, so stale markup never lingers. */
  clearPageJsonLd(): void {
    for (const key of ['faq', 'article', 'service', 'breadcrumb']) this.removeJsonLd(key);
  }

  // --- internals -----------------------------------------------------

  private setJsonLd(key: string, data: unknown): void {
    const id = this.LD_ID_PREFIX + key;
    let script = this.doc.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.type = 'application/ld+json';
      script.id = id;
      this.doc.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  private removeJsonLd(key: string): void {
    this.doc.getElementById(this.LD_ID_PREFIX + key)?.remove();
  }

  private setCanonical(url: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }

  private absolute(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const base = environment.siteUrl.replace(/\/$/, '');
    return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  /** Exposed for components that need to know if they can touch window. */
  get browser(): boolean {
    return this.isBrowser;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}
