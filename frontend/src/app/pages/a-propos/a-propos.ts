import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, map, of, shareReplay, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import { Reveal } from '../../shared/directives/reveal.directive';
import { FaqSection } from '../../shared/faq-section/faq-section';
import { ClosingCta } from '../../shared/closing-cta/closing-cta';
import { WhyChooseUs } from '../../shared/why-choose-us/why-choose-us';
import type { Page } from '../../core/models/api.models';

/**
 * À propos.
 *
 * Body copy lives in the `pages` table rather than the template — it was
 * hard-coded before, which left this page missing five of the live site's
 * sections, including the "Vous Souhaitez Nous Rejoindre ?" block that the
 * header's Recrutement link targets.
 */
@Component({
  selector: 'app-a-propos',
  standalone: true,
  imports: [RouterLink, AsyncPipe, Reveal, FaqSection, ClosingCta, WhyChooseUs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './a-propos.html',
  styleUrl: './a-propos.scss',
})
export class APropos implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly settings$ = this.api.settings$;
  readonly careers$ = this.api.getCareers().pipe(catchError(() => of([])));
  readonly certifications$ = this.api.getCertifications().pipe(catchError(() => of([])));

  /**
   * The page's structured blocks, split by kind.
   *
   * The values and the team roster used to be buried in the single `body`
   * HTML string, which could only ever render as one column of prose. They
   * are rows now, so the template can lay them out as cards and an editor can
   * still change them.
   */
  private readonly blocks$ = this.api.getPageBlocks('a-propos').pipe(
    catchError(() => of([])),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly valeurs$ = this.blocks$.pipe(map((b) => b.filter((x) => x.kind === 'valeur')));
  readonly equipe$ = this.blocks$.pipe(map((b) => b.filter((x) => x.kind === 'equipe')));

  readonly page$ = this.api.getPage('a-propos').pipe(
    tap((page) => this.applySeo(page)),
    catchError(() => of(null)),
  );

  ngOnInit(): void {
    this.seo.clearPageJsonLd();
    this.seo.setBreadcrumbs([
      { label: 'Accueil', path: '/' },
      { label: 'À propos', path: '/a-propos' },
    ]);
  }

  private applySeo(page: Page): void {
    this.seo.apply({
      title: page.meta_title,
      description: page.meta_description,
      path: '/a-propos',
      image: page.hero_image ?? undefined,
    });
  }
}
