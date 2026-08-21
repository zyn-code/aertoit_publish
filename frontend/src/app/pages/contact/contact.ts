import { AsyncPipe } from '@angular/common';
import { SocialLinks } from '../../shared/social-links/social-links';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import type { ApiErrorBody, QuoteRequestPayload } from '../../core/models/api.models';
import { FaqSection } from '../../shared/faq-section/faq-section';
import { ClosingCta } from '../../shared/closing-cta/closing-cta';

/** Mirrors the server regex so the client rejects the same shapes. */
const FRENCH_PHONE = /^(?:(?:\+|00)33[\s.-]?(?:\(0\)[\s.-]?)?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AsyncPipe, FaqSection, ClosingCta, SocialLinks],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  readonly settings$ = this.api.settings$;
  readonly services$ = this.api.getServices();

  readonly submitting = signal(false);
  readonly succeeded = signal(false);
  readonly formError = signal<string | null>(null);
  /** Field-level messages returned by the API's 422 response. */
  readonly serverErrors = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group({
    serviceSlug: ['', Validators.required],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(FRENCH_PHONE)]],
    email: ['', [Validators.required, Validators.email]],
    commune: ['', [Validators.required, Validators.minLength(2)]],
    message: [''],
    // RGPD art. 13 — required, and persisted as the audit trail. The live
    // site collects four personal fields with no consent mechanism at all.
    consentGiven: [false, Validators.requiredTrue],
    // Honeypot: hidden from users, so any value indicates a bot.
    website: [''],
  });

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: 'Contact & devis gratuit — Aertoit Couverture, Val-de-Marne',
      description:
        'Demandez votre devis gratuit pour vos travaux de toiture, isolation ou charpente dans le Val-de-Marne. Notre équipe vous recontacte sous 48h.',
      path: '/contact',
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Contact', path: '/contact' },
    ]);
  }

  /** True once the field should show its error (touched or submit attempted). */
  showError(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  serverError(field: string): string | undefined {
    return this.serverErrors()[field];
  }

  submit(): void {
    this.formError.set(null);
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Merci de corriger les champs signalés avant d’envoyer.');
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();

    const payload: QuoteRequestPayload = {
      serviceSlug: raw.serviceSlug,
      fullName: raw.fullName,
      phone: raw.phone,
      email: raw.email,
      commune: raw.commune,
      message: raw.message || undefined,
      consentGiven: true,
      sourcePage: '/contact',
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

        if (err.status === 422 && body?.details) {
          this.serverErrors.set(body.details);
          this.formError.set(body.error);
        } else if (err.status === 429) {
          this.formError.set(
            'Trop de demandes envoyées depuis cet appareil. Merci de réessayer dans quelques minutes.',
          );
        } else {
          this.formError.set(
            'Votre demande n’a pas pu être envoyée. Merci de réessayer ou de nous appeler directement.',
          );
        }
      },
    });
  }
}
