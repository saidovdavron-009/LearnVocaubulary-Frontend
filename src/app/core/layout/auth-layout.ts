import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Icon } from '../../shared/ui/icon/icon';
import { Logo } from '../../shared/ui/logo/logo';
import { Tag } from '../../shared/ui/tag/tag';
import { apiUrl } from '../api/api-url';
import { CefrLevel } from '../api/enums';
import { PaginatedResponse } from '../api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context';

/** Swagger: GET /api/words → GetAllWordsResponse (bezak kartochkalari uchun kerakli maydonlar). */
interface BrandWord {
  id: number;
  text: string;
  cefrLevel: CefrLevel | null;
  primaryTranslation: string | null;
}

const CARD_POSITIONS = [
  'top-[33%] left-[8%] rotate-[4deg]',
  'top-[28%] left-[40%] -rotate-[4deg]',
  'top-[46%] left-[36%] rotate-[2deg]',
];
const LEVEL_COLORS = ['violet', 'mint', 'yellow'] as const;

/**
 * Figma: 02 Kirish — chapda binafsha brend paneli, o'ngda forma.
 * Paneldagi so'z kartochkalari lug'atdan olinadi (lug'at bo'sh bo'lsa ko'rinmaydi).
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink, Icon, Logo, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh items-start bg-page' },
  template: `
    <!-- Chap panel joyida qotadi (sticky, ekran balandligida); faqat o'ngdagi forma scroll bo'ladi. -->
    <aside class="sticky top-0 hidden h-dvh w-160 shrink-0 flex-col overflow-hidden bg-violet lg:flex" aria-hidden="true">
      <!-- Bezak shakllar -->
      <div class="absolute -top-12 left-[68%] size-56 rotate-[18deg] rounded-[48px] bg-coral"></div>
      <div class="absolute top-[51%] -right-10 size-20 rounded-full bg-mint"></div>
      <div class="absolute -bottom-30 -left-40 size-80 rounded-full bg-yellow"></div>

      <a routerLink="/" class="relative z-10 mt-14 ml-16 self-start" tabindex="-1">
        <app-logo tone="yellow" [inverse]="true" />
      </a>

      @for (word of words(); track word.id; let i = $index) {
        <div
          class="absolute z-10 flex w-max max-w-64 min-w-30 flex-col gap-2 rounded-card bg-surface p-5 shadow-card"
          [class]="positions[i]"
        >
          <div class="flex items-center gap-2">
            @if (word.cefrLevel) {
              <app-tag [color]="levelColors[i]">{{ word.cefrLevel.toUpperCase() }}</app-tag>
            }
            <app-icon name="speaker" [size]="16" class="text-fg-muted" />
          </div>
          <p class="truncate font-display text-h2 text-fg">{{ word.text }}</p>
          @if (word.primaryTranslation) {
            <p class="truncate text-label text-violet-text">{{ word.primaryTranslation }}</p>
          }
        </div>
      }

      <div class="relative z-10 mt-auto mb-16 flex flex-col gap-6 px-16">
        <p class="font-display text-h1 text-fg-inverse">Har kuni bir qadam — yangi tilga yetib kelasiz.</p>
        <p class="text-body-lg text-fg-inverse/80">
          Aqlli takrorlash tizimi so'zlarni qachon qaytarish kerakligini o'zi hisoblaydi. Siz faqat mashq qilasiz.
        </p>
      </div>
    </aside>

    <main id="main" class="flex min-h-dvh flex-1 flex-col items-center justify-center self-stretch px-4 py-10 md:px-10">
      <a routerLink="/" class="mb-8 lg:hidden" aria-label="So'zchi — bosh sahifa">
        <app-logo />
      </a>
      <div class="w-full max-w-110">
        <router-outlet />
      </div>
    </main>
  `,
})
export class AuthLayout {
  private readonly http = inject(HttpClient);

  protected readonly words = signal<BrandWord[]>([]);
  protected readonly positions = CARD_POSITIONS;
  protected readonly levelColors = LEVEL_COLORS;

  constructor() {
    this.http
      .get<PaginatedResponse<BrandWord>>(apiUrl('/words'), {
        params: { onlyMine: false, page: 1, pageSize: 3 },
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .subscribe({ next: (r) => this.words.set(r.data.slice(0, 3)), error: () => undefined });
  }
}
