import { ChangeDetectionStrategy, Component, OnInit, REQUEST_CONTEXT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <div class="container container--narrow" style="text-align: center">
        <h1>Page introuvable</h1>
        <p>
          La page que vous cherchez n’existe pas ou a été déplacée. Vous pouvez revenir à l’accueil
          ou nous contacter directement.
        </p>
        <p style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap">
          <a routerLink="/" class="btn btn--primary">Retour à l’accueil</a>
          <a routerLink="/contact" class="btn btn--ghost">Nous contacter</a>
        </p>
      </div>
    </section>
  `,
})
export class NotFound implements OnInit {
  private readonly seo = inject(SeoService);

  /**
   * Present only during SSR — server.ts passes a mutable object in as the
   * request context and reads the flag back after rendering.
   *
   * Without this the server answers a missing URL with HTTP 200 and a "page
   * introuvable" body: a soft 404. Google treats those as indexable thin
   * pages competing with the real ones. RESPONSE_INIT is not usable here
   * because Angular reads it before the component renders.
   */
  private readonly requestContext = inject(REQUEST_CONTEXT, { optional: true }) as {
    notFound?: boolean;
  } | null;

  constructor() {
    if (this.requestContext) {
      this.requestContext.notFound = true;
    }
  }

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: 'Page introuvable — Aertoit Couverture',
      description: 'La page que vous cherchez n’existe pas ou a été déplacée.',
      path: '/404',
      noIndex: true,
    });
  }
}
