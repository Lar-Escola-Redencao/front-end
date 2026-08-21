import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'backoffice',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/backoffice-home/backoffice-home').then((m) => m.BackofficeHome),
  },
  { path: '**', redirectTo: 'login' },
];
