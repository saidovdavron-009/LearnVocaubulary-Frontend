import { Routes } from '@angular/router';

const crud = (path: string, title: string) => ({
  path,
  title: `${title} — So'zchi Admin`,
  data: { resource: path },
  loadComponent: () => import('./crud/admin-crud').then((m) => m.AdminCrud),
});

/** Admin panel sahifalari (AdminLayout ichida, faqat admin roli). */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: "Umumiy ko'rinish — So'zchi Admin",
    loadComponent: () => import('./overview/admin-overview').then((m) => m.AdminOverview),
  },
  {
    path: 'users',
    title: "Foydalanuvchilar — So'zchi Admin",
    loadComponent: () => import('./users/admin-users-page').then((m) => m.AdminUsersPage),
  },
  {
    path: 'reports',
    title: "Shikoyatlar — So'zchi Admin",
    loadComponent: () => import('./reports/admin-reports-page').then((m) => m.AdminReportsPage),
  },
  crud('words', "So'zlar"),
  crud('decks', "To'plamlar"),
  crud('categories', 'Kategoriyalar'),
  crud('achievements', 'Yutuqlar'),
  crud('languages', 'Tillar'),
  {
    path: 'settings',
    title: "Sozlamalar — So'zchi Admin",
    loadComponent: () => import('./settings/admin-settings').then((m) => m.AdminSettings),
  },
];
