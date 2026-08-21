import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';

/**
 * Blog index.
 *
 * The live site has no such page — /blog returns 404 — so four of its eight
 * articles have no internal link path at all and are reachable only from the
 * XML sitemap. This page gives every post a home.
 */
@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [RouterLink, AsyncPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './blog-list.html',
  styleUrl: './blog.scss',
})
export class BlogList implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly posts$ = this.api.getBlogPosts(1, 24);

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.apply({
      title: 'Conseils toiture & isolation — Le blog d’Aertoit Couverture',
      description:
        'Nos conseils de couvreurs sur l’entretien de toiture, l’isolation, les gouttières et la rénovation énergétique dans le Val-de-Marne.',
      path: '/blog',
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Blog', path: '/blog' },
    ]);
  }
}
