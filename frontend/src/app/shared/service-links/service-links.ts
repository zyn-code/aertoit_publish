import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Service } from '../../core/models/api.models';

/**
 * Compact service navigation, sitting across the foot of the homepage hero.
 *
 * Six plain white cards — icon, name, one action — straddling the edge
 * between the photograph and the white page below it, so the first thing
 * under the headline is a way into each trade.
 *
 * Deliberately unlike the photographic showcase further down the page: this
 * one is a signpost, that one is the presentation. Same six services, same
 * routes, different job.
 *
 * Reads the parent services exactly as the API returns them. `nav_group`
 * carries the short label the navigation uses ("Fenêtres VELUX" rather than
 * "Fenêtres de Toit VELUX"), and `nav_group_order` the running order; both
 * already drive the header menu, so the two stay in step on their own.
 */
@Component({
  selector: 'app-service-links',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-links.html',
  styleUrl: './service-links.scss',
})
export class ServiceLinks {
  readonly services = input.required<readonly Service[]>();

  readonly items = computed(() =>
    [...this.services()]
      .filter((s) => !s.parent_id)
      .sort((a, b) => (a.nav_group_order ?? 0) - (b.nav_group_order ?? 0))
      .map((s) => ({
        slug: s.slug,
        // The short navigation label, falling back to the full page name so
        // a service with no group set still reads correctly.
        label: s.nav_group?.trim() || s.name,
        icon: s.icon ?? '',
      })),
  );
}
