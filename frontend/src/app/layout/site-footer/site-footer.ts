import { AsyncPipe } from '@angular/common';
import { SocialLinks } from '../../shared/social-links/social-links';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ConsentService } from '../../core/services/consent.service';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, AsyncPipe, SocialLinks],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  private readonly api = inject(ApiService);

  protected readonly consent = inject(ConsentService);

  readonly settings$ = this.api.settings$;
  readonly services$ = this.api.getServices();
  /** Computed, not hard-coded — the live site's footer still reads 2025. */
  readonly currentYear = new Date().getFullYear();
}
