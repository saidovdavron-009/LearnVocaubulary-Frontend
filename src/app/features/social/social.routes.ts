import { Routes } from '@angular/router';

/** social moduli: ilova ichi (AppLayout ichida). */
export const SOCIAL_APP_ROUTES: Routes = [
  {
    path: 'friends',
    title: "Do'stlar — So'zchi",
    loadComponent: () => import('./friends/public/get-friends/get-friends').then((m) => m.GetFriends),
  },
  {
    path: 'notifications',
    title: "Bildirishnomalar — So'zchi",
    loadComponent: () =>
      import('./notifications/public/get-notifications/get-notifications').then((m) => m.GetNotifications),
  },
];
