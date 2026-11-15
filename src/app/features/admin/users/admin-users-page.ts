import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminUsersTable } from './admin-users-table';

/** Admin: Foydalanuvchilar — to'liq ro'yxat (qidiruv, filtr, sahifalash). */
@Component({
  selector: 'app-admin-users-page',
  imports: [AdminUsersTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header>
      <h1 class="font-display text-h1 text-fg">Foydalanuvchilar</h1>
      <p class="mt-1 text-body-lg text-fg-secondary">Rollar, holat va bloklash</p>
    </header>
    <app-admin-users-table />
  `,
})
export class AdminUsersPage {}
