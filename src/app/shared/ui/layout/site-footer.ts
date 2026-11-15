import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../logo/logo';
import { SiteLink } from './site-header';

export interface FooterColumn {
  title: string;
  links: SiteLink[];
}

/** Figma: Site/Footer (1440 × 342, to'q fon). */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-ink' },
  template: `
    <div class="mx-auto flex max-w-360 flex-col gap-10 px-4 pt-14 pb-8 md:px-10 xl:px-25">
      <div class="flex flex-col gap-10 lg:flex-row lg:gap-16">
        <div class="flex flex-1 flex-col gap-3.5">
          <a routerLink="/" class="self-start rounded-input" aria-label="So'zchi — bosh sahifa">
            <app-logo [inverse]="true" />
          </a>
          <p class="max-w-80 text-body text-line-strong">
            Har kuni 10 daqiqa — va yangi til sizniki. Aqlli takrorlash tizimi bilan so'zlarni hech qachon
            unutmang.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:gap-16">
          @for (column of columns(); track column.title) {
            <nav class="flex w-45 max-w-full flex-col gap-3" [attr.aria-label]="column.title">
              <p class="text-label-caps text-yellow uppercase">{{ column.title }}</p>
              @for (item of column.links; track item.label) {
                <a [routerLink]="item.link" class="text-body font-semibold text-fg-inverse hover:text-yellow">
                  {{ item.label }}
                </a>
              }
            </nav>
          }
        </div>
      </div>

      <div class="h-px bg-fg-inverse/12"></div>

      <div class="flex flex-col gap-2 text-caption text-line-strong sm:flex-row sm:justify-between">
        <p>© {{ year }} So'zchi. Barcha huquqlar himoyalangan.</p>
        <p>Toshkentda bilan yaratildi</p>
      </div>
    </div>
  `,
})
export class SiteFooter {
  readonly columns = input.required<FooterColumn[]>();
  protected readonly year = new Date().getFullYear();
}
