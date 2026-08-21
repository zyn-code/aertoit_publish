import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Reveal } from '../directives/reveal.directive';

/**
 * Closing call to action, repeated at the foot of every content page.
 *
 * The live site ends its service, blog and contact pages with this same
 * block; the rebuild originally had it only on the homepage, which is part
 * of why those pages measured well short of content parity.
 */
@Component({
  selector: 'app-closing-cta',
  standalone: true,
  imports: [RouterLink, AsyncPipe, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let settings = settings$ | async;
    <section class="section closing-cta" [attr.aria-labelledby]="headingId">
      <div class="container container--narrow" appReveal>
        <h2 [id]="headingId">{{ heading() }}</h2>
        <p>
          Contactez-nous dès que possible pour convenir d’un rendez-vous avec une estimation
          gratuite.
        </p>
        <div class="closing-cta__actions">
          <a routerLink="/contact" class="btn btn--primary">
            Demande de devis <span class="btn__arrow" aria-hidden="true">→</span>
          </a>
          @if (settings) {
            <a [href]="'tel:' + settings.phone_e164" class="btn btn--on-dark">
              Appelez-nous dès maintenant
            </a>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './closing-cta.scss',
})
export class ClosingCta {
  private readonly api = inject(ApiService);

  readonly heading = input('Aertoit Couverture : votre partenaire de confiance');

  readonly settings$ = this.api.settings$;
  /** Stable id so the section's aria-labelledby resolves. */
  protected readonly headingId = 'closing-cta-title';
}
