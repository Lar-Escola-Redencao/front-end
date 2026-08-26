import { Routes } from '@angular/router';
import { DiretoriaComponent } from './components/diretoria/diretoria.component';
import { canDeactivateGuard } from './guards/can-deactivate.guard';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'diretoria',
    component: DiretoriaComponent,
    canActivate: [authGuard],
    canDeactivate: [canDeactivateGuard],
  },
  { path: '', redirectTo: '/diretoria', pathMatch: 'full' },
  { path: '**', redirectTo: '/diretoria' },
];
