import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogPostSummary } from '../../core/models/api.models';

/** A post plus the slot it occupies in the composition. */
interface Tile {
  readonly post: BlogPostSummary;
  /** `wide` spans two thirds of the row; `small` spans one. */
  readonly size: 'wide' | 'small';
  readonly theme: 'green' | 'blue';
  /** Named grid area, so the desktop composition is declared in CSS. */
  readonly area: 'a' | 'b' | 'c' | 'd';
}

/**
 * Homepage "Le Blog" composition.
 *
 * Four slots in the arrangement the approved design shows — wide, small on the
 * top row; small, wide on the bottom — as named grid areas, so the layout is
 * stated once and the posts are dealt into it. No absolute positioning, and
 * DOM order is publication order regardless of a tile's visual size.
 *
 * With fewer than four published posts the grid rebalances rather than
 * leaving a hole: three fills the first three slots, two takes the wide pair,
 * one spans the row. Nothing is duplicated and no placeholder is invented.
 */
@Component({
  selector: 'app-blog-mosaic',
  standalone: true,
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './blog-mosaic.html',
  styleUrl: './blog-mosaic.scss',
})
export class BlogMosaic {
  readonly posts = input.required<readonly BlogPostSummary[]>();

  /** The four designed slots, in the order they are filled. */
  private static readonly SLOTS: ReadonlyArray<Omit<Tile, 'post'>> = [
    { size: 'wide', theme: 'green', area: 'a' },
    { size: 'small', theme: 'blue', area: 'b' },
    { size: 'small', theme: 'green', area: 'c' },
    { size: 'wide', theme: 'blue', area: 'd' },
  ];

  readonly tiles = computed<readonly Tile[]>(() =>
    this.posts()
      .slice(0, BlogMosaic.SLOTS.length)
      .map((post, i) => ({ post, ...BlogMosaic.SLOTS[i] })),
  );

  /** Drives the grid template, so a short list still fills its row. */
  readonly count = computed(() => this.tiles().length);
}
