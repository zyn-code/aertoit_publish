import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

/**
 * Réalisations gallery.
 *
 * webB's 28 project pages are its single strongest asset and webA has no
 * equivalent, so this is the main content addition of the rebuild.
 *
 * Aertoit publishes no project archive today, so the seeded rows are marked
 * unpublished and the page renders an explicit empty state rather than
 * inventing chantiers to fill the grid.
 */
@Component({
  selector: 'app-realisations',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './realisations.html',
  styleUrl: './realisations.scss',
})
export class Realisations implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly projects$ = this.api.getProjects();

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: 'Nos réalisations de toiture dans le Val-de-Marne — Aertoit',
      description:
        'Découvrez nos chantiers de couverture, isolation, charpente et pose de fenêtres de toit réalisés dans le Val-de-Marne et en Île-de-France.',
      path: '/realisations',
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Réalisations', path: '/realisations' },
    ]);
  }
}
