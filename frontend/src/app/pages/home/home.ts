import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { catchError, of, shareReplay } from 'rxjs';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import { FaqSection } from '../../shared/faq-section/faq-section';
import { ReviewsCarousel } from '../../shared/reviews-carousel/reviews-carousel';
import { BlogMosaic } from '../../shared/blog-mosaic/blog-mosaic';
import { ServiceLinks } from '../../shared/service-links/service-links';
import { ServiceShowcase } from '../../shared/service-showcase/service-showcase';
import { Reveal } from '../../shared/directives/reveal.directive';

/** One step of the estimate process. */
interface ProcessStep {
  readonly number: number;
  readonly title: string;
  readonly text: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    AsyncPipe,
    Reveal,
    FaqSection,
    ReviewsCarousel,
    BlogMosaic,
    ServiceLinks,
    ServiceShowcase,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly settings$ = this.api.settings$;

  /**
   * `shareReplay` because the template reads some of these through more than
   * one `async` pipe — the certifications appear in the hero and again in
   * their own band. Without it each pipe opens its own subscription and
   * fires its own HTTP request.
   *
   * `catchError` keeps one failing endpoint from blanking the whole page; the
   * template renders that section's empty state instead.
   */
  readonly services$ = this.api.getServices().pipe(
    catchError(() => of([])),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly certifications$ = this.api.getCertifications().pipe(
    catchError(() => of([])),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  /**
   * The hero photograph.
   *
   * `hero_slides` is the pool and the first published row is the one shown —
   * so changing the hero is a `sort_order` edit, not a code change. The brief
   * calls for a single large image, so the rotating panel that used to read
   * this endpoint is gone; the remaining rows are alternates waiting to be
   * promoted.
   */
  readonly heroSlides$ = this.api.getHeroSlides().pipe(
    catchError(() => of([])),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly testimonials$ = this.api.getTestimonials().pipe(catchError(() => of([])));
  /** Four, because the approved composition has four slots. */
  readonly posts$ = this.api.getBlogPosts(1, 4).pipe(catchError(() => of(null)));

  /** Falls back to a static heading if absent, so the band keeps its title. */
  readonly savoirFaire$ = this.api
    .getPage('savoir-faire-francais')
    .pipe(catchError(() => of(null)));

  /**
   * Aertoit's own three-step process, unchanged in wording and order.
   *
   * Held here rather than in the template so the markup is one loop instead
   * of three near-identical blocks.
   */
  readonly processSteps: readonly ProcessStep[] = [
    {
      number: 1,
      title: 'Sélectionnez votre service',
      text: 'Choisissez le service qui vous convient parmi nos prestations en remplissant le formulaire de contact.',
    },
    {
      number: 2,
      title: 'Choisissez votre date',
      text: 'Nos assistantes vous contacteront dans les plus brefs délais pour convenir d’un rendez-vous d’estimation.',
    },
    {
      number: 3,
      title: 'Obtenez votre devis',
      text: 'Suite à la visite de notre expert, vous recevez notre devis selon les travaux souhaités.',
    },
  ];

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: 'Couvreur dans le Val-de-Marne — Aertoit Couverture',
      description:
        'Spécialiste des travaux de couverture, Aertoit intervient sur la toiture, l’isolation et la charpente dans tout le Val-de-Marne. Devis gratuit.',
      path: '/',
      type: 'website',
    });
  }
}
