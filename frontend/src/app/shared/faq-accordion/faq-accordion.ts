import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { Faq } from '../../core/models/api.models';

/**
 * FAQ accordion.
 *
 * Was built on native <details>/<summary>, which is keyboard- and
 * screen-reader-correct for free but cannot expose `aria-expanded` /
 * `aria-controls`, cannot be held to one-open-at-a-time, and cannot animate
 * its height. This is the explicit button-and-region pattern instead.
 *
 * The answers stay in the DOM when collapsed — hidden by a collapsed grid
 * row rather than `hidden` or `display: none`. On a prerendered site that
 * matters twice over: the copy is in the served HTML for crawlers, and it
 * matches the FAQPage JSON-LD the section emits, which Google requires.
 */
@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="faq">
      @for (faq of faqs(); track faq.id; let i = $index) {
        <div class="faq__item" [class.is-open]="isOpen(i)">
          <h3 class="faq__heading">
            <button
              type="button"
              class="faq__question"
              [id]="'faq-q-' + faq.id"
              [attr.aria-expanded]="isOpen(i)"
              [attr.aria-controls]="'faq-a-' + faq.id"
              (click)="toggle(i)"
            >
              <span class="faq__text">{{ faq.question }}</span>
              <span class="faq__chevron" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 15.4 5.6 9l1.4-1.4 5 5 5-5L18.4 9z" />
                </svg>
              </span>
            </button>
          </h3>

          <div
            class="faq__panel"
            role="region"
            [id]="'faq-a-' + faq.id"
            [attr.aria-labelledby]="'faq-q-' + faq.id"
          >
            <div class="faq__answer">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './faq-accordion.scss',
})
export class FaqAccordion {
  readonly faqs = input.required<readonly Faq[]>();

  /** Index of the open item. The first is open on load, as the design shows. */
  private readonly openIndex = signal(0);

  isOpen(index: number): boolean {
    return this.openIndex() === index;
  }

  /** One open at a time; clicking the open item closes it. */
  toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? -1 : index));
  }
}
