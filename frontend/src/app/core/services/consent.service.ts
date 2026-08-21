import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type ConsentChoice = 'accepted' | 'refused';

const STORAGE_KEY = 'aertoit-consent';
/** CNIL guidance: a consent choice should be re-asked after at most 6 months. */
const MAX_AGE_DAYS = 180;

interface StoredConsent {
  choice: ConsentChoice;
  at: number;
}

/**
 * Analytics consent.
 *
 * The live site fires GA4 and writes `_ga` cookies on first paint with no
 * banner anywhere — the CNIL's most actively enforced rule. Here nothing
 * analytics-related loads until `accept()` is called, and refusing is as
 * easy as accepting (also a CNIL requirement).
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Null means no valid choice on record — the banner should show. */
  readonly choice = signal<ConsentChoice | null>(null);
  readonly bannerVisible = signal(false);

  private scriptLoaded = false;

  init(): void {
    if (!this.isBrowser) return;

    const stored = this.read();
    if (!stored) {
      this.bannerVisible.set(true);
      return;
    }

    this.choice.set(stored.choice);
    if (stored.choice === 'accepted') this.loadAnalytics();
  }

  accept(): void {
    this.persist('accepted');
    this.loadAnalytics();
  }

  refuse(): void {
    this.persist('refused');
    this.clearAnalyticsCookies();
  }

  /** Reopens the banner — the "Paramètres des cookies" footer link. */
  reopen(): void {
    this.bannerVisible.set(true);
  }

  private persist(choice: ConsentChoice): void {
    this.choice.set(choice);
    this.bannerVisible.set(false);
    if (!this.isBrowser) return;
    try {
      const payload: StoredConsent = { choice, at: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Private browsing or storage disabled — the banner simply reappears.
    }
  }

  private read(): StoredConsent | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredConsent;
      if (parsed.choice !== 'accepted' && parsed.choice !== 'refused') return null;

      const ageDays = (Date.now() - parsed.at) / 86_400_000;
      if (ageDays > MAX_AGE_DAYS) return null;

      return parsed;
    } catch {
      return null;
    }
  }

  /** Injects gtag.js only after consent. Never called otherwise. */
  private loadAnalytics(): void {
    const id = environment.gaMeasurementId;
    if (!this.isBrowser || !id || this.scriptLoaded) return;
    this.scriptLoaded = true;

    const script = this.doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    this.doc.head.appendChild(script);

    const win = this.doc.defaultView as (Window & { dataLayer?: unknown[] }) | null;
    if (!win) return;
    win.dataLayer = win.dataLayer || [];
    function gtag(...args: unknown[]): void {
      win!.dataLayer!.push(args);
    }
    gtag('js', new Date());
    // IP anonymisation is expected by the CNIL for audience measurement.
    gtag('config', id, { anonymize_ip: true });
  }

  /** Removes any _ga cookies left from a previous acceptance. */
  private clearAnalyticsCookies(): void {
    if (!this.isBrowser) return;
    const host = this.doc.location.hostname;
    for (const cookie of this.doc.cookie.split(';')) {
      const name = cookie.split('=')[0]?.trim();
      if (!name?.startsWith('_ga')) continue;
      for (const domain of [host, `.${host}`]) {
        this.doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
      }
      this.doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}
