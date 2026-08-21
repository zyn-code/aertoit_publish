import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Reveal } from '../directives/reveal.directive';

/**
 * "Pourquoi Nous Choisir ?" — repeated across the live site's service pages
 * and à-propos.
 *
 * Stored once in `pages` and rendered here rather than duplicated into every
 * page body. It was briefly lost altogether: the body extractor classifies
 * anything appearing on most pages as chrome, and this is real content that
 * happens to repeat, so it needed lifting out explicitly.
 *
 * Renders nothing if the row is missing, so a failed fetch leaves a clean
 * page rather than an empty titled section.
 */
@Component({
  selector: 'app-why-choose-us',
  standalone: true,
  imports: [AsyncPipe, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let page = page$ | async;
    @if (page) {
      <section class="section why-choose" aria-labelledby="why-choose-title">
        <div class="container container--narrow">
          <div class="section__header section__header--centered" appReveal>
            <h2 id="why-choose-title">{{ page.h1 }}</h2>
            @if (page.intro) {
              <p class="why-choose__intro">{{ page.intro }}</p>
            }
          </div>
          <div class="why-choose__items prose" appReveal="fade" [innerHTML]="page.body"></div>
        </div>
      </section>
    }
  `,
  styleUrl: './why-choose-us.scss',
})
export class WhyChooseUs {
  private readonly api = inject(ApiService);

  readonly page$ = this.api.getPage('pourquoi-nous-choisir').pipe(catchError(() => of(null)));
}
