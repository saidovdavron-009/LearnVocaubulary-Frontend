import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Jadval qobig'i (13 Mening so'zlarim, 18 Admin panel): sarlavha qatori muted fonda,
 * ustun nomlari Label Caps, qatorlar orasida chiziq. Telefonda gorizontal suriladi.
 *
 * <app-table>
 *   <table>
 *     <thead><tr><th>So'z</th>...</tr></thead>
 *     <tbody><tr [attr.data-selected]="selected || null"><td>...</td></tr></tbody>
 *   </table>
 * </app-table>
 */
@Component({
  selector: 'app-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'block w-full overflow-x-auto [&_table]:w-full [&_table]:min-w-180 [&_table]:border-collapse [&_table]:text-left [&_thead_th]:h-13 [&_thead_th]:bg-muted [&_thead_th]:px-3 [&_thead_th]:text-label-caps [&_thead_th]:uppercase [&_thead_th]:whitespace-nowrap [&_thead_th]:text-fg-secondary [&_th:first-child]:pl-5 [&_td:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:last-child]:pr-5 [&_tbody_td]:h-15.5 [&_tbody_td]:px-3 [&_tbody_td]:text-body [&_tbody_td]:text-fg [&_tbody_tr]:border-b [&_tbody_tr]:border-line [&_tbody_tr:last-child]:border-b-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-page [&_tbody_tr[data-selected]]:bg-violet-soft/60',
  },
  template: `<ng-content />`,
})
export class Table {}
