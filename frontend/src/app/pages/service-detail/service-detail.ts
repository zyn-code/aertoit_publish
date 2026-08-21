import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap, tap, catchError, of, combineLatest, shareReplay } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import type { Service } from '../../core/models/api.models';
import { Reveal } from '../../shared/directives/reveal.directive';
import { FaqSection } from '../../shared/faq-section/faq-section';
import { ClosingCta } from '../../shared/closing-cta/closing-cta';
import { WhyChooseUs } from '../../shared/why-choose-us/why-choose-us';
import { QuickQuote } from '../../shared/quick-quote/quick-quote';
import { CommuneRotator } from '../../shared/commune-rotator/commune-rotator';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [
    RouterLink,
    AsyncPipe,

    Reveal,
    FaqSection,
    ClosingCta,
    CommuneRotator,
    WhyChooseUs,
    QuickQuote,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.scss',
})
export class ServiceDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly settings$ = this.api.settings$;

  /** All services, nested, so a page can find its own children and parent. */
  private readonly tree$ = this.api.getServices().pipe(shareReplay(1));

  readonly service$ = this.route.paramMap.pipe(
    map((params) => params.get('slug') ?? ''),
    switchMap((slug) => this.api.getService(slug)),
    tap((service) => this.applySeo(service)),
    catchError(() => of(null)),
    shareReplay(1),
  );

  /** Sub-services of this page, empty when it is itself a sub-service. */
  readonly children$ = combineLatest([this.service$, this.tree$]).pipe(
    map(([service, tree]) =>
      service ? (tree.find((t) => t.id === service.id)?.children ?? []) : [],
    ),
  );

  /** The parent, when viewing a sub-service — used for the breadcrumb. */
  readonly parent$ = combineLatest([this.service$, this.tree$]).pipe(
    map(([service, tree]) =>
      service?.parent_id ? (tree.find((t) => t.id === service.parent_id) ?? null) : null,
    ),
  );

  private applySeo(service: Service): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: service.meta_title,
      description: service.meta_description,
      path: `/service/${service.slug}`,
      image: service.hero_image ?? undefined,
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: service.name, path: `/service/${service.slug}` },
    ]);
    this.seo.setService({
      name: service.name,
      description: service.meta_description,
      path: `/service/${service.slug}`,
    });
  }
}
