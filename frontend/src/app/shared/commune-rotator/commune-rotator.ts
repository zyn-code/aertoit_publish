import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Rotating service-area line shown under the H1 on service pages.
 *
 * This is a local-SEO device on the live site: one page cycles through a
 * dozen town names so it can rank for "couverture en tuiles à Antony" as
 * well as the generic query. Three details make that work without the costs
 * it usually carries:
 *
 *  - **Every commune is in the HTML.** Crawlers need the text, so all of
 *    them render; CSS shows one at a time. Nothing is injected later.
 *  - **It is not a heading.** The live site marks these as headings, which
 *    is why its sub-service pages ship two H1s and a dozen H2s. Here the
 *    rotator is a <p>, so the page keeps exactly one H1.
 *  - **Screen readers get a stable sentence,** not a caption changing every
 *    three seconds. The rotating layer is aria-hidden and a single
 *    visually-hidden line lists the areas served.
 *
 * Under `prefers-reduced-motion` the cycling stops and the full list is
 * shown as static text.
 */
@Component({
  selector: 'app-commune-rotator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (communes().length) {
      <p class="commune-rotator" [class.is-static]="!animating()">
        <span class="commune-rotator__viewport" aria-hidden="true">
          @for (commune of communes(); track commune; let i = $index) {
            <span class="commune-rotator__item" [class.is-current]="i === index()">
              {{ commune }}
            </span>
          }
        </span>

        <!-- One stable sentence for assistive tech, instead of a label that
             changes every few seconds. -->
        <span class="visually-hidden"> Nous intervenons {{ spokenList() }}. </span>
      </p>
    }
  `,
  styleUrl: './commune-rotator.scss',
})
export class CommuneRotator {
  readonly communes = input<readonly string[]>([]);
  /** Milliseconds each commune stays on screen. */
  readonly interval = input(2600);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  protected readonly index = signal(0);
  protected readonly animating = signal(false);

  /**
   * "dans le Val-de-Marne, à Antony, à Sceaux …" as one readable phrase.
   *
   * Only the leading preposition is lowercased so the entries fold into the
   * sentence; lowercasing the whole string mangles the town names into
   * "à l'haÿ-les-roses".
   */
  protected readonly spokenList = computed(() =>
    this.communes()
      .map((c) => c.charAt(0).toLowerCase() + c.slice(1))
      .join(', '),
  );

  constructor() {
    if (!this.isBrowser) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // stays static, showing the full list

    this.animating.set(true);
    const id = setInterval(() => {
      const total = this.communes().length;
      if (total > 1) this.index.update((i) => (i + 1) % total);
    }, this.interval());

    this.destroyRef.onDestroy(() => clearInterval(id));
  }
}
