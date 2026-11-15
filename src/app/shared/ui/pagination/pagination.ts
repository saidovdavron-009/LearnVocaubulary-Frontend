import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Select, SelectOption } from '../select/select';

type PageItem = { kind: 'page'; page: number } | { kind: 'gap'; key: string };

/**
 * Sahifalash (13 Mening so'zlarim ekranidagidek):
 * chapda "Sahifada: [10] · 1–10 / 248", o'ngda ‹ 1 2 3 … 25 ›.
 * Backend PaginatedResponse maydonlarini to'g'ridan-to'g'ri qabul qiladi.
 */
@Component({
  selector: 'app-pagination',
  imports: [Icon, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' },
  template: `
    <div class="flex items-center gap-2 text-body text-fg-secondary">
      @if (pageSizeOptions().length) {
        <span class="whitespace-nowrap" aria-hidden="true">Sahifada:</span>
        <app-select
          label="Sahifadagi qatorlar soni"
          [hideLabel]="true"
          size="s"
          class="w-20"
          [options]="sizeOptions()"
          [selected]="pageSize()"
          (selectedChange)="pageSizeChange.emit($any($event))"
        />
      }
      <span class="whitespace-nowrap">· {{ rangeText() }}</span>
    </div>

    @if (totalPages() > 1) {
      <nav aria-label="Sahifalar" class="flex items-center gap-2">
        <button
          type="button"
          class="flex size-10 items-center justify-center rounded-md border-2 border-line bg-surface text-fg transition-colors hover:border-line-strong disabled:opacity-40"
          [disabled]="page() <= 1"
          aria-label="Oldingi sahifa"
          (click)="go(page() - 1)"
        >
          <app-icon name="chevron-left" [size]="16" />
        </button>
        @for (item of items(); track item.kind === 'page' ? item.page : item.key) {
          @if (item.kind === 'page') {
            <button
              type="button"
              class="flex h-10 min-w-10 items-center justify-center rounded-md border-2 px-2 text-body-strong transition-colors"
              [class]="
                item.page === page()
                  ? 'border-violet bg-violet text-fg-inverse'
                  : 'border-line bg-surface text-fg hover:border-line-strong'
              "
              [attr.aria-current]="item.page === page() ? 'page' : null"
              [attr.aria-label]="item.page + '-sahifa'"
              (click)="go(item.page)"
            >
              {{ item.page }}
            </button>
          } @else {
            <span
              class="flex h-10 min-w-10 items-center justify-center rounded-md border-2 border-line bg-surface text-body-strong text-fg"
              aria-hidden="true"
              >…</span
            >
          }
        }
        <button
          type="button"
          class="flex size-10 items-center justify-center rounded-md border-2 border-line bg-surface text-fg transition-colors hover:border-line-strong disabled:opacity-40"
          [disabled]="page() >= totalPages()"
          aria-label="Keyingi sahifa"
          (click)="go(page() + 1)"
        >
          <app-icon name="chevron-right" [size]="16" />
        </button>
      </nav>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly totalPages = input.required<number>();
  /** Bo'sh massiv berilsa "Sahifada" tanlagichi ko'rinmaydi. */
  readonly pageSizeOptions = input<number[]>([10, 20, 50]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();


  protected readonly sizeOptions = computed<SelectOption[]>(() =>
    this.pageSizeOptions().map((n) => ({ value: n, label: String(n) })),
  );

  protected readonly rangeText = computed(() => {
    const total = this.totalCount();
    if (total === 0) return '0 / 0';
    const from = (this.page() - 1) * this.pageSize() + 1;
    const to = Math.min(total, this.page() * this.pageSize());
    return `${from}–${to} / ${total}`;
  });

  protected readonly items = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    const pages = new Set<number>([1, total, current - 1, current, current + 1]);
    if (current <= 3) [2, 3].forEach((p) => pages.add(p));
    if (current >= total - 2) [total - 1, total - 2].forEach((p) => pages.add(p));
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

    const result: PageItem[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) result.push({ kind: 'gap', key: `gap-${p}` });
      result.push({ kind: 'page', page: p });
    });
    return result;
  });

  protected go(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) this.pageChange.emit(page);
  }

}
