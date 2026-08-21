import { AsyncPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, filter, map, of, startWith } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Service } from '../../core/models/api.models';

/** One category in the services menu, with its own sub-services. */
export interface NavCategory {
  readonly label: string;
  readonly slug: string;
  readonly children: readonly { readonly slug: string; readonly name: string }[];
}

/**
 * Site header.
 *
 * Light and solid on every page. It used to be transparent over the homepage
 * hero and share the hero's navy, which merged the two into one dark block —
 * the header had no edge of its own and interior pages opened on a second
 * dark band immediately below it.
 *
 * The services menu lists the six principal categories, each with its own
 * sub-services beneath it: a compact three-by-two dropdown for navigation.
 * The large photographic cards are the homepage's job, not the header's.
 */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly settings$ = this.api.settings$;

  /** An empty nav is survivable; a thrown error would take the shell down. */
  private readonly services = toSignal(this.api.getServices().pipe(catchError(() => of([]))), {
    initialValue: [] as Service[],
  });

  /**
   * The six principal service categories, in the order `nav_group_order`
   * gives them.
   *
   * Each carries its own sub-services, which the menu lists beneath the
   * category title. Sub-service order is the `sort_order` the API already
   * applies; nothing is re-sorted or restated here.
   */
  readonly categories = computed<readonly NavCategory[]>(() =>
    this.services()
      .filter((s) => !!s.nav_group && s.nav_group_order !== null)
      .sort((a, b) => (a.nav_group_order ?? 0) - (b.nav_group_order ?? 0))
      .map((s) => ({
        label: s.nav_group as string,
        slug: s.slug,
        children: (s.children ?? []).map((c) => ({ slug: c.slug, name: c.name })),
      })),
  );

  /**
   * Which category is expanded in the mobile accordion.
   *
   * Desktop shows every group at once; on a phone that would be a very long
   * scroll, so the categories collapse and open one at a time.
   */
  readonly openCategory = signal<string | null>(null);

  toggleCategory(slug: string): void {
    this.openCategory.update((open) => (open === slug ? null : slug));
  }

  isCategoryOpen(slug: string): boolean {
    return this.openCategory() === slug;
  }

  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  private clearCloseTimer(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  /**
   * Opens the menu when the pointer enters the trigger, on devices with a
   * real pointer. Guarded by `matchMedia`: on touch the first tap would both
   * hover and click, closing the panel as it opened.
   */
  onTriggerEnter(): void {
    if (!this.isBrowser) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(max-width: 1080px)').matches) return;
    this.clearCloseTimer();
    this.servicesOpen.set(true);
  }

  /**
   * Closes after a grace period, so the pointer can cross the gap between the
   * trigger and the panel without the menu shutting under it.
   */
  onMenuLeave(): void {
    if (!this.isBrowser) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    this.clearCloseTimer();
    this.closeTimer = setTimeout(() => this.servicesOpen.set(false), 220);
  }

  onMenuEnter(): void {
    this.clearCloseTimer();
  }

  /** Mobile drawer. Always closed on the server, so SSR and first paint agree. */
  readonly menuOpen = signal(false);
  /** Services disclosure — the desktop mega-menu and the mobile accordion. */
  readonly servicesOpen = signal(false);

  /** Drops a shadow once the page has moved, so the bar detaches from content. */
  readonly scrolled = signal(false);

  /** True while any service route is active, for the parent item's state. */
  readonly onServiceRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/service/')),
      startWith(this.router.url.startsWith('/service/')),
    ),
    { initialValue: false },
  );

  constructor() {
    // Closing on navigation has to be explicit: Angular reuses the header
    // across routes, so a drawer left open would persist onto the new page.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.close());

    // Locking the page behind the drawer stops the body scrolling under it,
    // which on iOS otherwise leaves the reader stranded mid-document.
    effect(() => {
      if (!this.isBrowser) return;
      const locked = this.menuOpen();
      this.document.body.classList.toggle('is-nav-open', locked);
    });

    this.destroyRef.onDestroy(() => {
      this.clearCloseTimer();
      if (this.isBrowser) this.document.body.classList.remove('is-nav-open');
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.servicesOpen()) {
      this.servicesOpen.set(false);
      return;
    }
    if (this.menuOpen()) this.close();
  }

  /** A click anywhere else dismisses the mega-menu, as a menu is expected to. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.servicesOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.servicesOpen.set(false);
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.isBrowser) return;
    this.scrolled.set(window.scrollY > 8);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    if (!this.menuOpen()) this.servicesOpen.set(false);
  }

  toggleServices(): void {
    this.servicesOpen.update((open) => !open);
  }

  close(): void {
    this.clearCloseTimer();
    this.menuOpen.set(false);
    this.servicesOpen.set(false);
    this.openCategory.set(null);
  }
}
