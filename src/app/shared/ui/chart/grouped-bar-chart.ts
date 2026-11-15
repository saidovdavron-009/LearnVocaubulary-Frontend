import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface ChartSeries {
  name: string;
  /** Tailwind fon klassi, masalan "bg-violet". */
  color: string;
}

export interface ChartGroup {
  /** O'q ostidagi qisqa yozuv ("Du", "12", "Yan"). */
  label: string;
  /** Tooltip sarlavhasi ("Dushanba, 28-oktabr"). */
  title: string;
  values: number[];
  /** Ajratib ko'rsatiladigan guruh (masalan, bugun). */
  highlight?: boolean;
}

/**
 * Guruhli ustunli diagramma (05 Dashboard — "Haftalik faollik").
 * Bitta o'q, ingichka ustunlar, 4px yumaloq uchlar, ustunlar orasida 2px oraliq,
 * hover/fokusda tooltip, legend va ekran o'quvchilar uchun jadval.
 */
@Component({
  selector: 'app-grouped-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <ul class="flex flex-wrap gap-4" aria-hidden="true">
      @for (s of series(); track s.name) {
        <li class="flex items-center gap-2 text-label text-fg-secondary">
          <span class="size-2.5 rounded-xs" [class]="s.color"></span>{{ s.name }}
        </li>
      }
    </ul>

    <div class="relative" [style.height.px]="height()" aria-hidden="true">
      <div class="absolute inset-x-0 bottom-0 h-px bg-line"></div>
      <div class="absolute inset-0 flex items-end justify-between" [class]="groups().length > 12 ? 'gap-0.5' : 'gap-2'">
        @for (group of groups(); track $index; let i = $index) {
          <div
            class="relative flex h-full flex-1 cursor-default items-end justify-center gap-0.5 rounded-sm outline-none focus-visible:bg-muted"
            tabindex="0"
            [attr.aria-label]="describe(group)"
            (mouseenter)="active.set(i)"
            (mouseleave)="active.set(null)"
            (focus)="active.set(i)"
            (blur)="active.set(null)"
          >
            @for (value of group.values; track $index; let s = $index) {
              <div
                class="max-w-5 flex-1 rounded-t-xs transition-[height] duration-300 ease-out"
                [class]="value > 0 ? series()[s]?.color ?? 'bg-line-strong' : 'bg-line'"
                [style.height]="value > 0 ? percent(value) + '%' : '3px'"
              ></div>
            }
            @if (active() === i) {
              <div
                class="pointer-events-none absolute bottom-full z-10 mb-2 w-max min-w-32 rounded-lg bg-ink px-3 py-2 text-caption text-fg-inverse shadow-card"
                role="tooltip"
              >
                <p class="mb-1 text-label">{{ group.title }}</p>
                @for (s of series(); track s.name; let k = $index) {
                  <p class="flex items-center gap-2">
                    <span class="size-2 rounded-xs" [class]="s.color"></span>
                    {{ s.name }}: <span class="font-extrabold">{{ group.values[k] ?? 0 }}</span>
                  </p>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>

    <div class="flex justify-between" [class]="groups().length > 12 ? 'gap-0.5' : 'gap-2'" aria-hidden="true">
      @for (group of groups(); track $index) {
        <span
          class="flex-1 text-center text-caption"
          [class]="group.highlight ? 'text-fg font-extrabold' : 'text-fg-muted'"
          >{{ group.label }}</span
        >
      }
    </div>

    <table class="sr-only">
      <caption>{{ caption() }}</caption>
      <thead>
        <tr>
          <th scope="col">Sana</th>
          @for (s of series(); track s.name) {
            <th scope="col">{{ s.name }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (group of groups(); track $index) {
          <tr>
            <th scope="row">{{ group.title }}</th>
            @for (v of group.values; track $index) {
              <td>{{ v }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class GroupedBarChart {
  readonly series = input.required<ChartSeries[]>();
  readonly groups = input.required<ChartGroup[]>();
  readonly caption = input('Diagramma ma’lumotlari');
  readonly height = input(180);

  protected readonly active = signal<number | null>(null);
  private readonly max = computed(() => Math.max(1, ...this.groups().flatMap((g) => g.values)));

  protected percent(value: number): number {
    return Math.max(4, (value / this.max()) * 100);
  }

  protected describe(group: ChartGroup): string {
    return group.title + ': ' + this.series().map((s, i) => `${s.name} ${group.values[i] ?? 0}`).join(', ');
  }
}
