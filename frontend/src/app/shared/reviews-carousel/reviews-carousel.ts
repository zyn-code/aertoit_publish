import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Testimonial } from '../../core/models/api.models';

/**
 * The "Nos clients en parlent le mieux" carousel.
 *
 * Built on native scroll-snap rather than a transform-driven slider, which
 * buys three things for free and keeps them consistent: momentum swiping on
 * touch, arrow-key scrolling once the track has focus, and a usable section
 * even before hydration — the cards are laid out and scrollable by CSS alone.
 * The buttons below are progressive enhancement on top of that.
 *
 * Nothing here autoplays. A rotating testimonial that moves under the reader
 * is the usual cause of WCAG 2.2.2 complaints, and the design does not ask
 * for one.
 */
@Component({
  selector: 'app-reviews-carousel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reviews-carousel.html',
  styleUrl: './reviews-carousel.scss',
})
export class ReviewsCarousel {
  readonly reviews = input.required<readonly Testimonial[]>();
  /** Optional "Avis Google" destination; the pill is plain text without it. */
  readonly googleUrl = input<string | null>(null);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  /** Index of the card nearest the left edge of the viewport. */
  readonly active = signal(0);

  readonly count = computed(() => this.reviews().length);

  /** Blue and green alternate, as the designs show. */
  variant(index: number): 'blue' | 'green' {
    return index % 2 === 0 ? 'green' : 'blue';
  }

  /** Five stars, filled up to the rating. */
  readonly starSlots = [1, 2, 3, 4, 5] as const;

  private cards(): HTMLElement[] {
    const el = this.track()?.nativeElement;
    return el ? Array.from(el.querySelectorAll<HTMLElement>('[data-card]')) : [];
  }

  /**
   * Recomputes the active dot from scroll position.
   *
   * Derived from geometry rather than tracked in a counter, so a swipe, a
   * keyboard scroll and an arrow click all converge on the same answer.
   */
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.track()?.nativeElement;
    const cards = this.cards();
    if (!el || !cards.length) return;

    const left = el.scrollLeft;
    let nearest = 0;
    let best = Infinity;
    cards.forEach((card, i) => {
      const distance = Math.abs(card.offsetLeft - el.offsetLeft - left);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    this.active.set(nearest);
  }

  goTo(index: number): void {
    const el = this.track()?.nativeElement;
    const cards = this.cards();
    const card = cards[index];
    if (!el || !card) return;

    // `scroll-behavior: smooth` lives in CSS and is switched off under
    // prefers-reduced-motion, so this respects the setting without asking.
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft });
    this.active.set(index);
  }

  /** Steps one card, clamped — the track does not wrap. */
  step(delta: number): void {
    const next = Math.min(Math.max(this.active() + delta, 0), this.count() - 1);
    this.goTo(next);
  }

  readonly atStart = computed(() => this.active() === 0);
  readonly atEnd = computed(() => this.active() >= this.count() - 1);
}
