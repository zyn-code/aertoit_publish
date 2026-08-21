import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import { Reveal } from '../../shared/directives/reveal.directive';
import { ClosingCta } from '../../shared/closing-cta/closing-cta';
import { FaqSection } from '../../shared/faq-section/faq-section';
import { Service } from '../../core/models/api.models';

/**
 * Complete list of prestations, grouped main service by main service.
 *
 * The site had no services index: every service page was reachable only from
 * the header menu or from its parent, and the homepage's "see everything"
 * action had nowhere to point. This is that page — an alternating
 * image-and-content band per main service, each followed by its own
 * sub-services, so the hierarchy is legible rather than implied.
 *
 * Reads the same `/services` response as the header and the homepage. No new
 * endpoint, no second loading path.
 */
@Component({
  selector: 'app-services-index',
  standalone: true,
  imports: [RouterLink, AsyncPipe, Reveal, FaqSection, ClosingCta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services-index.html',
  styleUrl: './services-index.scss',
})
export class ServicesIndex implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly services$ = this.api.getServices().pipe(catchError(() => of([] as Service[])));

  children(service: Service): readonly Service[] {
    return service.children ?? [];
  }

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: 'Nos prestations de toiture — Aertoit Couverture',
      description:
        'Couverture, charpente, isolation, étanchéité, nettoyage et fenêtres de toit VELUX : découvrez toutes les prestations Aertoit dans le Val-de-Marne.',
      path: '/nos-prestations',
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Nos prestations', path: '/nos-prestations' },
    ]);
  }
}
