import { Routes } from '@angular/router';
import { Home } from './pages/public/home/home';
import { Dashboard } from './pages/private/dashboard/dashboard'; 
import { DashboardHome } from './pages/private/dashboard/dashboard-home/dashboard-home';
import { ContentManagement } from './pages/private/content-management/content-management';
import { ColaboradorComponent } from '@pages/private/colaborador/colaborador.component';
import { authGuard } from './shared/guards/auth-guard';
import { guestGuard } from './shared/guards/guest-guard';

export const routes: Routes = [
    { path: '', component: Home},
    {
        path: 'dashboard',
        //loadComponent: () =>
        //import('./features/backoffice-home/backoffice-home').then((m) => m.BackofficeHome),
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
        path: 'entrar',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/public/login/login').then((m) => m.Login),
    },
    { path: '**', redirectTo: 'login' }
    
    /*import { EventoComponent } from './components/evento/evento.component';
    import { canDeactivateGuard } from './guards/can-deactivate.guard';

    export const routes: Routes = [
    {
        path: 'eventos',
        component: EventoComponent,
        canDeactivate: [canDeactivateGuard]
    }*/
];
