import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SiteHeader } from './layout/site-header/site-header';
import { SiteFooter } from './layout/site-footer/site-footer';
import { CookieBanner } from './shared/cookie-banner/cookie-banner';
import { ApiService } from './core/services/api.service';
import { SeoService } from './core/services/seo.service';
import { ConsentService } from './core/services/consent.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SiteHeader, SiteFooter, CookieBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main-content">Aller au contenu principal</a>

    <app-site-header />

    <!-- The <main> landmark the skip link targets. The live site has no
         landmark elements at all, so this is new. -->
    <main id="main-content" tabindex="-1">
      <router-outlet />
    </main>

    <app-site-footer />
    <app-cookie-banner />
  `,
})
export class App {
  private readonly seo = inject(SeoService);
  private readonly api = inject(ApiService);
  private readonly consent = inject(ConsentService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Reads the stored choice and, only if it was "accepted", injects
    // gtag.js. Nothing analytics-related loads before this decision.
    this.consent.init();

    // LocalBusiness JSON-LD is emitted once for the whole site rather than
    // per page, so its @id stays stable and services can point at it as
    // their provider.
    this.api.settings$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((settings) => this.seo.setLocalBusiness(settings));
  }
}
