import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SiteHeader } from './site-header';
import { ApiService } from '../../core/services/api.service';
import { Service, SiteSettings } from '../../core/models/api.models';

/** Minimal service row; only the fields the header reads are meaningful. */
function service(partial: Partial<Service>): Service {
  return {
    id: 0,
    parent_id: null,
    communes: null,
    slug: '',
    name: '',
    h1: '',
    card_title: '',
    card_excerpt: '',
    intro: '',
    body: null,
    icon: null,
    hero_image: null,
    hero_image_alt: null,
    meta_title: '',
    meta_description: '',
    sort_order: 0,
    nav_group: null,
    nav_group_order: null,
    ...partial,
  };
}

const SERVICES: Service[] = [
  service({
    id: 1,
    slug: 'couverture',
    name: 'Couverture',
    sort_order: 1,
    nav_group: 'Couverture',
    nav_group_order: 3,
    children: [
      service({ id: 10, parent_id: 1, slug: 'couverture-en-tuiles', name: 'Tuiles' }),
      service({ id: 11, parent_id: 1, slug: 'couverture-en-zinc', name: 'Zinc' }),
    ],
  }),
  service({
    id: 2,
    slug: 'isolation',
    name: 'Isolation',
    sort_order: 2,
    nav_group: 'Isolation',
    nav_group_order: 1,
  }),
  service({
    id: 3,
    slug: 'travaux-de-charpente',
    name: 'Charpente',
    sort_order: 3,
    nav_group: null,
    nav_group_order: null,
  }),
  service({
    id: 4,
    slug: 'etancheite-de-toit-terrasse',
    name: 'Étanchéité',
    sort_order: 4,
    nav_group: 'Étanchéité',
    nav_group_order: 2,
  }),
  // No nav_group: must not appear as a pill of its own.
  service({ id: 5, slug: 'orphelin', name: 'Orphelin', sort_order: 9 }),
];

const SETTINGS = { phone_e164: '+33146639959', phone_display: '01 46 63 99 59' } as SiteSettings;

describe('SiteHeader', () => {
  let fixture: ComponentFixture<SiteHeader>;
  let header: SiteHeader;

  function build(services: Service[] = SERVICES) {
    TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [
        provideRouter([]),
        {
          provide: ApiService,
          useValue: { settings$: of(SETTINGS), getServices: () => of(services) },
        },
      ],
    });
    fixture = TestBed.createComponent(SiteHeader);
    header = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('is-nav-open');
  });

  it('exposes one entry per category, ordered by nav_group_order', () => {
    build();
    expect(header.categories().map((c) => c.label)).toEqual([
      'Isolation',
      'Étanchéité',
      'Couverture',
    ]);
  });

  it('links each category to its own service page', () => {
    build();
    expect(header.categories().map((c) => c.slug)).toEqual([
      'isolation',
      'etancheite-de-toit-terrasse',
      'couverture',
    ]);
  });

  it('omits a service that carries no category', () => {
    build();
    expect(header.categories().map((c) => c.slug)).not.toContain('orphelin');
  });

  it('keeps sub-services out of the first navigation level', () => {
    build();
    // Couverture has two children in the fixture; neither may appear as a
    // category of its own — they belong under it.
    const slugs = header.categories().map((c) => c.slug);
    expect(slugs).not.toContain('couverture-en-tuiles');
    expect(slugs).not.toContain('couverture-en-zinc');
    expect(header.categories().find((c) => c.slug === 'couverture')?.children.length).toBe(2);
  });

  it('survives an empty services response', () => {
    build([]);
    expect(header.categories()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.site-header')).not.toBeNull();
  });

  it('locks the page behind the open drawer and releases it on close', () => {
    build();
    header.toggleMenu();
    fixture.detectChanges();
    expect(document.body.classList.contains('is-nav-open')).toBeTrue();

    header.close();
    fixture.detectChanges();
    expect(document.body.classList.contains('is-nav-open')).toBeFalse();
  });

  it('closes the services panel first, then the drawer, on Escape', () => {
    build();
    header.toggleMenu();
    header.toggleServices();
    expect(header.servicesOpen()).toBeTrue();

    header.onEscape();
    expect(header.servicesOpen()).toBeFalse();
    expect(header.menuOpen()).toBeTrue(); // the drawer stays up

    header.onEscape();
    expect(header.menuOpen()).toBeFalse();
  });

  it('exposes the disclosure state to assistive tech', () => {
    build();
    const toggle: HTMLElement = fixture.nativeElement.querySelector('.site-header__menu-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    header.toggleServices();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders a link for every category in the menu', () => {
    build();
    header.toggleServices();
    fixture.detectChanges();
    const hrefs = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('.mega__cat'),
    ).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/service/isolation',
      '/service/etancheite-de-toit-terrasse',
      '/service/couverture',
    ]);
  });

  it('groups each sub-service under its own category', () => {
    build();
    header.toggleServices();
    fixture.detectChanges();
    const groups = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.mega__group'),
    ).map((g) => ({
      cat: g.querySelector('.mega__cat')?.getAttribute('href'),
      subs: Array.from<HTMLAnchorElement>(g.querySelectorAll('.mega__subs a')).map((a) =>
        a.getAttribute('href'),
      ),
    }));
    // Couverture owns both children in the fixture; the other two own none.
    expect(groups).toEqual([
      { cat: '/service/isolation', subs: [] },
      { cat: '/service/etancheite-de-toit-terrasse', subs: [] },
      {
        cat: '/service/couverture',
        subs: ['/service/couverture-en-tuiles', '/service/couverture-en-zinc'],
      },
    ]);
  });

  it('opens one category at a time in the mobile accordion', () => {
    build();
    header.toggleCategory('couverture');
    expect(header.isCategoryOpen('couverture')).toBeTrue();

    header.toggleCategory('isolation');
    expect(header.isCategoryOpen('isolation')).toBeTrue();
    expect(header.isCategoryOpen('couverture')).toBeFalse();

    header.toggleCategory('isolation');
    expect(header.isCategoryOpen('isolation')).toBeFalse();
  });
});
