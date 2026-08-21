import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { shareReplay, type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  BlogPost,
  BlogPostSummary,
  Certification,
  HeroSlide,
  PageBlock,
  Faq,
  JobPosting,
  Page,
  Paginated,
  Project,
  QuoteRequestPayload,
  Service,
  SiteSettings,
  SubmitResult,
  Testimonial,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * Settings appear in the header and footer of every page, so the response
   * is cached for the lifetime of the app (and of each SSR render).
   */
  readonly settings$: Observable<SiteSettings> = this.http
    .get<SiteSettings>(`${this.base}/settings`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  /** Editorial page content (à-propos). */
  getPage(slug: string): Observable<Page> {
    return this.http.get<Page>(`${this.base}/pages/${encodeURIComponent(slug)}`);
  }

  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.base}/services`);
  }

  getService(slug: string): Observable<Service> {
    return this.http.get<Service>(`${this.base}/services/${encodeURIComponent(slug)}`);
  }

  getTestimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(`${this.base}/testimonials`);
  }

  getCertifications(): Observable<Certification[]> {
    return this.http.get<Certification[]>(`${this.base}/certifications`);
  }

  /** Structured blocks for an editorial page, grouped by `kind`. */
  getPageBlocks(slug: string): Observable<PageBlock[]> {
    return this.http.get<PageBlock[]>(`${this.base}/pages/${encodeURIComponent(slug)}/blocks`);
  }

  getHeroSlides(): Observable<HeroSlide[]> {
    return this.http.get<HeroSlide[]>(`${this.base}/hero-slides`);
  }

  getFaqs(scope = 'global'): Observable<Faq[]> {
    return this.http.get<Faq[]>(`${this.base}/faqs`, {
      params: new HttpParams().set('scope', scope),
    });
  }

  getBlogPosts(page = 1, limit = 12): Observable<Paginated<BlogPostSummary>> {
    return this.http.get<Paginated<BlogPostSummary>>(`${this.base}/blog`, {
      params: new HttpParams().set('page', page).set('limit', limit),
    });
  }

  getBlogPost(slug: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.base}/blog/${encodeURIComponent(slug)}`);
  }

  getProjects(serviceSlug?: string): Observable<Project[]> {
    let params = new HttpParams();
    if (serviceSlug) params = params.set('service', serviceSlug);
    return this.http.get<Project[]>(`${this.base}/projects`, { params });
  }

  getProject(slug: string): Observable<Project> {
    return this.http.get<Project>(`${this.base}/projects/${encodeURIComponent(slug)}`);
  }

  getCareers(): Observable<JobPosting[]> {
    return this.http.get<JobPosting[]>(`${this.base}/careers`);
  }

  getCareer(slug: string): Observable<JobPosting> {
    return this.http.get<JobPosting>(`${this.base}/careers/${encodeURIComponent(slug)}`);
  }

  submitQuoteRequest(payload: QuoteRequestPayload): Observable<SubmitResult> {
    return this.http.post<SubmitResult>(`${this.base}/quote-requests`, payload);
  }
}
