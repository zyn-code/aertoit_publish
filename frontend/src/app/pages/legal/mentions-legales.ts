import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

/**
 * Mentions légales — mandatory for a French commercial site under LCEN
 * art. 6-III. The live site returns 404 for this URL.
 *
 * The company identifiers are read from `site_settings`. Any that are still
 * empty render as a visible placeholder rather than silently disappearing,
 * so an incomplete page is obvious before launch instead of after.
 */
@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mentions-legales.html',
  styleUrl: './legal.scss',
})
export class MentionsLegales implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly settings$ = this.api.settings$;

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: 'Mentions légales — Aertoit Couverture',
      description:
        'Mentions légales du site aertoit.fr : éditeur, hébergeur, propriété intellectuelle et coordonnées d’Aertoit Couverture.',
      path: '/mentions-legales',
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Mentions légales', path: '/mentions-legales' },
    ]);
  }
}
