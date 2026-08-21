import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Reveal } from '../directives/reveal.directive';
import type { ApiErrorBody, QuoteRequestPayload } from '../../core/models/api.models';

/** Mirrors the server regex so the client rejects the same shapes. */
const FRENCH_PHONE = /^(?:(?:\+|00)33[\s.-]?(?:\(0\)[\s.-]?)?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

/**
 * "Demande de Devis Rapide" — the short callback form the live site puts on
 * every service page.
 *
 * Deliberately not the contact form: it asks only what is needed to phone
 * someone back, so it posts `requestType: 'callback'` and the API skips its
 * e-mail and commune requirements. Consent is still mandatory.
 */
@Component({
  selector: 'app-quick-quote',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AsyncPipe, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quick-quote.html',
  styleUrl: './quick-quote.scss',
})
export class QuickQuote {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  /** Preselects the service this page is about. */
  readonly serviceSlug = input<string>('');
  readonly sourcePage = input<string>('');

  readonly services$ = this.api.getServices();
  readonly settings$ = this.api.settings$;

  readonly submitting = signal(false);
  readonly succeeded = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    serviceSlug: ['', Validators.required],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(FRENCH_PHONE)]],
    consentGiven: [false, Validators.requiredTrue],
    website: [''], // honeypot
  });

  constructor() {
    // Preselect once the parent knows which service it is rendering.
    queueMicrotask(() => {
      if (this.serviceSlug()) this.form.patchValue({ serviceSlug: this.serviceSlug() });
    });
  }

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Merci de corriger les champs signalés.');
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();

    const payload: QuoteRequestPayload = {
      requestType: 'callback',
      serviceSlug: raw.serviceSlug,
      fullName: raw.fullName,
      phone: raw.phone,
      consentGiven: true,
      sourcePage: this.sourcePage() || undefined,
      website: raw.website || undefined,
    };

    this.api.submitQuoteRequest(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.succeeded.set(true);
        this.form.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const body = err.error as ApiErrorBody | undefined;
        this.formError.set(
          err.status === 429
            ? 'Trop de demandes envoyées depuis cet appareil. Merci de réessayer dans quelques minutes.'
            : (body?.error ??
                'Votre demande n’a pas pu être envoyée. Merci de réessayer ou de nous appeler.'),
        );
      },
    });
  }
}
