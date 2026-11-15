import { Routes } from '@angular/router';

/** common moduli: ochiq sahifalar (PublicLayout ichida). */
export const COMMON_PUBLIC_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: "So'zchi — so'zlarni o'rganing, hech qachon unutmang",
    loadComponent: () => import('./home/public/get-home/home').then((m) => m.Home),
  },
];

/** common moduli: ilova ichi (AppLayout ichida). */
export const COMMON_APP_ROUTES: Routes = [
  {
    path: 'dashboard',
    title: "Bosh sahifa — So'zchi",
    loadComponent: () => import('./dashboard/public/get-dashboard/dashboard').then((m) => m.Dashboard),
  },
];
