/**
 * Response shapes returned by the Aertoit API.
 * These mirror the zod schemas and table columns in backend/.
 */

export interface SiteSettings {
  company_name: string;
  legal_name: string;
  tagline: string;
  founded_year: string;
  /** Single source of truth for the address — never hard-code it in a template. */
  contact_email: string;
  phone_display: string;
  phone_e164: string;
  address_street: string;
  address_locality: string;
  address_postal: string;
  address_region: string;
  address_country: string;
  service_area: string;
  social_linkedin: string;
  social_facebook: string;
  social_instagram: string;
  /** Empty until a profile URL is supplied; the links component skips blanks. */
  social_tiktok: string;
  /**
   * Retained as keys but deliberately empty: the 4.9 / 160 figures they held
   * could not be substantiated. Removing the keys outright would surface as
   * `undefined` in any template that still reads them.
   */
  rating_value: string;
  review_count: string;
  callback_promise: string;

  /**
   * Company identifiers required on the mentions légales page by LCEN
   * art. 6-III. Empty until Aertoit supplies them — the page renders a
   * visible placeholder rather than hiding the gap.
   */
  legal_siret: string;
  legal_rcs: string;
  legal_capital: string;
  legal_director: string;
  legal_vat: string;
  legal_insurer: string;
  host_name: string;
  host_address: string;

  [key: string]: string;
}

export interface Service {
  id: number;
  /** Null for a top-level service; set for the nine sub-services. */
  parent_id: number | null;
  /** Present only on the nested /services response, not on ?flat=1. */
  children?: Service[];
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

export interface Testimonial {
  id: number;
  author: string;
  author_role: string;
  headline: string;
  body: string;
  rating: number;
  google_url: string | null;
}

export interface Certification {
  id: number;
  name: string;
  description: string;
  logo: string | null;
  logo_alt: string;
  url: string | null;
}

/** One photograph in the homepage hero panel. */
export interface HeroSlide {
  id: number;
  image: string;
  image_alt: string;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  scope: string;
}

export interface BlogPostSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  cover_image_alt: string | null;
  author: string;
  published_at: string;
}

export interface BlogPost extends BlogPostSummary {
  body: string;
  meta_title: string;
  meta_description: string;
  updated_at: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  commune: string | null;
  postal_code: string | null;
  year: number | null;
  summary: string;
  body?: string | null;
  image_before: string | null;
  image_before_alt: string | null;
  image_after: string | null;
  image_after_alt: string | null;
  gallery?: { src: string; alt: string }[] | null;
  service_slug: string | null;
  service_name: string | null;
  /** Returned by the detail endpoint only; the list endpoint omits them. */
  meta_title?: string | null;
  meta_description?: string | null;
}

export interface JobPosting {
  id: number;
  slug: string;
  title: string;
  contract_type: string;
  location: string;
  summary: string;
  body?: string;
  meta_title?: string;
  meta_description?: string;
}

/** Payload for POST /api/quote-requests. */
export interface QuoteRequestPayload {
  /**
   * 'full' is the contact page form; 'callback' is the short service-page
   * block, which collects no e-mail or commune.
   */
  requestType?: 'full' | 'callback';
  serviceSlug: string;
  fullName: string;
  phone: string;
  email?: string;
  commune?: string;
  message?: string;
  consentGiven: true;
  sourcePage?: string;
  /** Honeypot — must stay empty. */
  website?: string;
}

export interface SubmitResult {
  ok: boolean;
  id?: number;
  message?: string;
}

/** 422 body from the API: `details` maps field name -> message. */
export interface ApiErrorBody {
  error: string;
  details?: Record<string, string>;
}

/** One structured block of an editorial page — a value, a team entry. */
export interface PageBlock {
  id: number;
  kind: string;
  title: string;
  text: string;
  icon: string;
  sort_order: number;
}

/** Editorial page (à-propos and any future static page). */
export interface Page {
  id: number;
  slug: string;
  h1: string;
  intro: string | null;
  body: string | null;
  hero_image: string | null;
  hero_image_alt: string | null;
  meta_title: string;
  meta_description: string;
  updated_at: string;
}
