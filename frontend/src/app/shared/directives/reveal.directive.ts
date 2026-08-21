import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

export type RevealVariant = 'up' | 'fade' | 'scale' | 'left' | 'right';

/**
 * Reveals an element as it scrolls into view, matching the motion the live
 * Framer site has on its sections and cards.
 *
 * The hidden starting state is applied by CSS scoped to `html.js`, a class an
 * inline script in index.html sets before first paint. That ordering matters:
 *
 *  - Without JavaScript the class is never added, so nothing is ever hidden.
 *    Content is readable rather than permanently invisible.
 *  - Because the class lands before paint, there is no flash of visible
 *    content being hidden and re-revealed.
 *  - Prerendered HTML is unaffected either way, so crawlers always receive
 *    the full markup — animation never costs us indexing.
 *
 * `prefers-reduced-motion` short-circuits the whole thing in CSS.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: {
    '[attr.data-reveal]': 'variant()',
    '[class.is-revealed]': 'revealed()',
    '[style.--reveal-delay]': 'delayMs()',
  },
})
export class Reveal {
  /**
   * Motion style. Accepts '' so the directive can be applied bare — writing
   * `appReveal` with no value binds an empty string, not the default.
   */
  readonly variantInput = input<RevealVariant | ''>('', { alias: 'appReveal' });

  /** Normalised variant; a bare `appReveal` means a short upward slide. */
  protected readonly variant = computed<RevealVariant>(() => this.variantInput() || 'up');

  /** Stagger index — each step adds 70ms, capped so long lists stay snappy. */
  readonly order = input(0, { alias: 'revealOrder' });

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly revealed = signal(false);
  protected readonly delayMs = computed(() => `${Math.min(this.order(), 6) * 70}ms`);

  constructor() {
    effect((onCleanup) => {
      if (!this.isBrowser || this.revealed()) return;

      const element = this.host.nativeElement as HTMLElement;

      // No observer support: show it and stop. Never leave content hidden.
      if (typeof IntersectionObserver === 'undefined') {
        this.revealed.set(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            this.revealed.set(true);
            observer.disconnect();
          }
        },
        // Fire slightly before the element is fully on screen so the motion
        // finishes about when the reader's eye arrives.
        { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
      );

      observer.observe(element);
      onCleanup(() => observer.disconnect());
    });
  }
}
