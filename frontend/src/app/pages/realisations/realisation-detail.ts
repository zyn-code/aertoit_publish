import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import type { Project } from '../../core/models/api.models';

@Component({
  selector: 'app-realisation-detail',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './realisation-detail.html',
  styleUrl: './realisations.scss',
})
export class RealisationDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly project$ = this.route.paramMap.pipe(
    map((params) => params.get('slug') ?? ''),
    switchMap((slug) => this.api.getProject(slug)),
    tap((project) => this.applySeo(project)),
    catchError(() => of(null)),
  );

  private applySeo(project: Project): void {
    this.seo.clearPageJsonLd();

    const where = project.commune ? ` à ${project.commune}` : '';
    this.seo.apply({
      title: project.meta_title || `${project.title}${where} — Aertoit Couverture`,
      description: project.meta_description || project.summary,
      path: `/realisations/${project.slug}`,
      image: project.image_after ?? undefined,
    });
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'Réalisations', path: '/realisations' },
      { label: project.title, path: `/realisations/${project.slug}` },
    ]);
  }
}
