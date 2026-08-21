import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

/**
 * Politique de confidentialité — required by RGPD art. 13 because the quote
 * form collects name, phone, email and commune. The live site has no such
 * page, and its form carries no consent mechanism at all.
 */
@Component({
  selector: 'app-politique-confidentialite',
  standalone: true,
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './politique-confidentialite.html',
  styleUrl: './legal.scss',
})
export class PolitiqueConfidentialite implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly settings$ = this.api.settings$;

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: 'Politique de confidentialité — Aertoit Couverture',
      description:
        'Comment Aertoit Couverture collecte, utilise et protège vos données personnelles, et comment exercer vos droits RGPD.',
      path: '/politique-de-confidentialite',
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Politique de confidentialité', path: '/politique-de-confidentialite' },
    ]);
  }
}
