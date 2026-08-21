import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import type { JobPosting } from '../../core/models/api.models';
import { FaqSection } from '../../shared/faq-section/faq-section';
import { ClosingCta } from '../../shared/closing-cta/closing-cta';

@Component({
  selector: 'app-carriere-detail',
  standalone: true,
  imports: [RouterLink, AsyncPipe, FaqSection, ClosingCta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carriere-detail.html',
  styleUrl: './carriere.scss',
})
export class CarriereDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly settings$ = this.api.settings$;

  readonly job$ = this.route.paramMap.pipe(
    map((params) => params.get('slug') ?? ''),
    switchMap((slug) => this.api.getCareer(slug)),
    tap((job) => this.applySeo(job)),
    catchError(() => of(null)),
  );

  /** Builds the application mailto with a prefilled subject line. */
  applyMailto(email: string, jobTitle: string): string {
    const subject = encodeURIComponent(`Candidature — ${jobTitle}`);
    return `mailto:${email}?subject=${subject}`;
  }

  private applySeo(job: JobPosting): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: job.meta_title ?? `${job.title} — Aertoit Couverture`,
      description: job.meta_description ?? job.summary,
      path: `/carriere/${job.slug}`,
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Recrutement', path: '/a-propos#recrutement' },
      { label: job.title, path: `/carriere/${job.slug}` },
    ]);
  }
}
