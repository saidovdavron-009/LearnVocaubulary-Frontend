import { Routes } from '@angular/router';

/** gamification moduli: ilova ichi (AppLayout ichida). */
export const GAMIFICATION_APP_ROUTES: Routes = [
  {
    path: 'stats',
    title: "Statistika — So'zchi",
    loadComponent: () => import('./stats/public/get-my-stats/get-my-stats').then((m) => m.GetMyStats),
  },
];
