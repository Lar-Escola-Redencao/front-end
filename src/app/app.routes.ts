import { Routes } from '@angular/router';
import { Home } from './pages/public/home/home';
import { Dashboard } from './pages/private/dashboard/dashboard'; 
import { DashboardHome } from './pages/private/dashboard/dashboard-home/dashboard-home';
import { ContentManagement } from './pages/private/content-management/content-management';
import { ColaboradorComponent } from '@pages/private/colaborador/colaborador.component';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
    { path: '', component: Home, redirectTo: 'login' },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        component: Dashboard,
        children: [
            { path: '', component: DashboardHome },
            { path: 'conteudo-publico', component: ContentManagement },
            { path: 'conteudo-publico/:secao', component: ContentManagement },
            { path: 'colaboradores', component: ColaboradorComponent}
        ]
    },
    {
        path: 'backoffice',
        loadComponent: () =>
        import('./features/backoffice-home/backoffice-home').then((m) => m.BackofficeHome),
    },
    {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/login/login').then((m) => m.Login),
    },
    { path: '**', redirectTo: 'login' }
];
