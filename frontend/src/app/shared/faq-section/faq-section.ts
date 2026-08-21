import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import { FaqAccordion } from '../faq-accordion/faq-accordion';
import { Reveal } from '../directives/reveal.directive';

/**
 * "Questions / Réponses" block, repeated across the service, blog and contact
 * pages. Wrapping it as a component means each page also emits the matching
 * FAQPage JSON-LD without duplicating that logic.
 *
 * Two columns per the approved design: the label, heading and a CTA card on
 * the left, the accordion on the right, over a wash that runs from pale blue
 * to pale green.
 */
@Component({
  selector: 'app-faq-section',
  standalone: true,
  imports: [AsyncPipe, RouterLink, FaqAccordion, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faq-section.html',
  styleUrl: './faq-section.scss',
})
export class FaqSection implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  /** Scope key; falls back to the shared 'global' set. */
  readonly scope = input('global');

  readonly faqs$ = this.api.getFaqs(this.scope()).pipe(catchError(() => of([])));

  ngOnInit(): void {
    this.faqs$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((faqs) => this.seo.setFaqPage(faqs));
  }
}
