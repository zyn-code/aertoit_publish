import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentService } from '../../core/services/consent.service';

/**
 * Cookie consent banner.
 *
 * "Refuser" carries exactly the same visual weight as "Accepter" — the CNIL
 * treats a visually de-emphasised refusal as invalid consent.
 */
@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (consent.bannerVisible()) {
      <div
        class="cookie-banner"
        role="dialog"
        aria-modal="false"
        aria-labelledby="cookie-title"
        aria-describedby="cookie-desc"
      >
        <div class="cookie-banner__inner">
          <div>
            <h2 id="cookie-title" class="cookie-banner__title">Cookies et mesure d’audience</h2>
            <p id="cookie-desc" class="cookie-banner__text">
              Nous utilisons des cookies de mesure d’audience pour comprendre comment notre site est
              consulté. Ils ne sont déposés qu’avec votre accord. En savoir plus dans notre
              <a routerLink="/politique-de-confidentialite">politique de confidentialité</a>.
            </p>
          </div>

          <div class="cookie-banner__actions">
            <button type="button" class="btn btn--ghost" (click)="consent.refuse()">Refuser</button>
            <button type="button" class="btn btn--primary" (click)="consent.accept()">
              Accepter
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './cookie-banner.scss',
})
export class CookieBanner {
  protected readonly consent = inject(ConsentService);
}
