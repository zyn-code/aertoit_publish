import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Service } from '../../core/models/api.models';

/** How many sub-services show before the disclosure hides the rest. */
const PREVIEW = 3;

/**
 * Homepage services showcase.
 *
 * Presents each *main* service as a photographic card carrying a preview of
 * its own sub-services, rather than flattening all seventeen service pages
 * into one grid — which would bury the six categories a visitor is actually
 * choosing between.
 *
 * Every card is the same size. An earlier version widened the cards that had
 * sub-services, which made the row read as two tiers of importance; the
 * approved reference repeats one card shape evenly instead.
 *
 * Consumes the existing `Service[]` from the shared API service exactly as
 * it arrives: parent rows with `children` nested, already filtered to
 * published and already ordered by `sort_order`. Nothing about names, slugs,
 * relationships or URLs is restated here.
 */
@Component({
  selector: 'app-service-showcase',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-showcase.html',
  styleUrl: './service-showcase.scss',
})
export class ServiceShowcase {
  readonly services = input.required<readonly Service[]>();

  /** Slugs whose sub-service list is expanded. */
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  children(service: Service): readonly Service[] {
    return service.children ?? [];
  }

  /** The sub-services currently shown for a card. */
  visibleChildren(service: Service): readonly Service[] {
    const all = this.children(service);
    return this.isExpanded(service) ? all : all.slice(0, PREVIEW);
  }

  hiddenCount(service: Service): number {
    return Math.max(0, this.children(service).length - PREVIEW);
  }

  isExpanded(service: Service): boolean {
    return this.expanded().has(service.slug);
  }

  toggle(service: Service): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(service.slug)) next.add(service.slug);
      return next;
    });
  }

  /** True when at least one card has sub-services, for the section's CTA. */
  readonly hasAnyChildren = computed(() =>
    this.services().some((s) => (s.children?.length ?? 0) > 0),
  );
}
