import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminReportsTable } from './admin-reports-table';

/** Admin: Shikoyatlar — to'liq ro'yxat (holat bo'yicha, sahifalash). */
@Component({
  selector: 'app-admin-reports-page',
  imports: [AdminReportsTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header>
      <h1 class="font-display text-h1 text-fg">Shikoyatlar</h1>
      <p class="mt-1 text-body-lg text-fg-secondary">Foydalanuvchilar so'zlardagi xatolar haqida yuborgan xabarlar</p>
    </header>
    <app-admin-reports-table />
  `,
})
export class AdminReportsPage {}
