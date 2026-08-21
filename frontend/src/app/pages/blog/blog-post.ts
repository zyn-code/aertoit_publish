import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import type { BlogPost } from '../../core/models/api.models';
import { FaqSection } from '../../shared/faq-section/faq-section';
import { ClosingCta } from '../../shared/closing-cta/closing-cta';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [RouterLink, AsyncPipe, DatePipe, FaqSection, ClosingCta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './blog-post.html',
  styleUrl: './blog.scss',
})
export class BlogPostPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly post$ = this.route.paramMap.pipe(
    map((params) => params.get('slug') ?? ''),
    switchMap((slug) => this.api.getBlogPost(slug)),
    tap((post) => this.applySeo(post)),
    map((post) => ({ ...post, safeBody: this.renderBody(post.body) })),
    catchError(() => of(null)),
  );

  /**
   * Article bodies are authored HTML held in the database, not user input,
   * so they are sanitised rather than trusted outright — bypassSecurityTrust
   * would disable Angular's escaping entirely.
   */
  private renderBody(html: string): SafeHtml {
    return this.sanitizer.sanitize(1 /* SecurityContext.HTML */, html) ?? '';
  }

  private applySeo(post: BlogPost): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: post.meta_title,
      description: post.meta_description,
      path: `/blog/${post.slug}`,
      image: post.cover_image ?? undefined,
      type: 'article',
      publishedAt: post.published_at,
      modifiedAt: post.updated_at,
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Blog', path: '/blog' },
      { label: post.title, path: `/blog/${post.slug}` },
    ]);
    this.seo.setArticle({
      title: post.title,
      description: post.meta_description,
      path: `/blog/${post.slug}`,
      image: post.cover_image ?? undefined,
      publishedAt: post.published_at,
      modifiedAt: post.updated_at,
      // schema.org requires an author, and this node is typed Organization,
      // so passing the individual writer's name was already a mismatch. With
      // the visible byline dropped, the company is the correct attribution.
      author: 'Aertoit Couverture',
    });
  }
}
