import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SiteSettings } from '../../core/models/api.models';

/** One social account, resolved from settings to a renderable link. */
interface SocialLink {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  /** Inline SVG path data, so the icons cost no extra requests. */
  readonly path: string;
}

/**
 * The "Suivez-nous" links, as icons rather than bare words — deck page 5,
 * "En bas de page aussi + peut être logo ?".
 *
 * Accounts come from `site_settings`, and an account with an empty value is
 * simply not rendered. TikTok is configured but has no URL yet, so it stays
 * hidden until one is supplied rather than shipping a link to nowhere.
 */
@Component({
  selector: 'app-social-links',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './social-links.html',
  styleUrl: './social-links.scss',
})
export class SocialLinks {
  readonly settings = input.required<SiteSettings>();
  /** `stacked` in the footer column, `inline` in the contact block. */
  readonly layout = input<'inline' | 'stacked'>('inline');

  private static readonly ICONS: ReadonlyArray<Omit<SocialLink, 'href'>> = [
    {
      key: 'social_linkedin',
      label: 'LinkedIn',
      path: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95C21.6 8.75 23 11 23 14.2V21h-4v-6c0-1.6-.03-3.66-2.23-3.66-2.24 0-2.58 1.74-2.58 3.54V21h-4V9Z',
    },
    {
      key: 'social_facebook',
      label: 'Facebook',
      path: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z',
    },
    {
      key: 'social_instagram',
      label: 'Instagram',
      path: 'M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16Zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-10.4a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z',
    },
    {
      key: 'social_tiktok',
      label: 'TikTok',
      path: 'M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.79-2.46V9.8a5.77 5.77 0 1 0 5.05 5.72V9.01a7.35 7.35 0 0 0 4.29 1.38V7.3a4.28 4.28 0 0 1-3.4-1.48Z',
    },
  ];

  readonly links = computed<readonly SocialLink[]>(() => {
    const s = this.settings() as unknown as Record<string, string | undefined>;
    return SocialLinks.ICONS.map((icon) => ({ ...icon, href: s[icon.key]?.trim() ?? '' })).filter(
      (link) => link.href.length > 0,
    );
  });
}
