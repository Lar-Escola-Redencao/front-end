import { Routes } from '@angular/router';
import { Home } from './pages/public/home/home';
import { Dashboard } from './pages/private/dashboard/dashboard'; 
import { DashboardHome } from './pages/private/dashboard/dashboard-home/dashboard-home';
import { ContentManagement } from './pages/private/content-management/content-management';
import { ColaboradorComponent } from '@pages/private/colaborador/colaborador.component';
import { authGuard } from './shared/guards/auth-guard';
import { guestGuard } from './shared/guards/guest-guard';
import { Usuario } from '@pages/private/usuario/usuario';
import { Diario } from '@pages/private/diario/diario';
import { UnidadesTurmas } from '@pages/private/unidades-turmas/unidades-turmas';

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
            { path: 'colaboradores', component: ColaboradorComponent},
            { path: 'usuarios', component: Usuario},
            { path: 'diario', component: Diario},
            { path: 'unidades-turmas', component: UnidadesTurmas}
        ]
    },
    {
        path: 'entrar',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/public/login/login').then((m) => m.Login),
    },
    { path: '**', redirectTo: 'login' }
];





    /*import { EventoComponent } from './components/evento/evento.component';
    import { canDeactivateGuard } from './guards/can-deactivate.guard';

    export const routes: Routes = [
    {
        path: 'eventos',
        component: EventoComponent,
        canDeactivate: [canDeactivateGuard]
    }*/


    /*import { AdminLayout } from './core/layout/admin-layout/admin-layout';
    import { DashboardPage } from './features/dashboard/dashboard-page';
    import { PublicContentPage } from './features/public-content/public-content-page';
    import { PlaceholderPage } from './features/placeholder/placeholder-page';

    export const routes: Routes = [
    {
        path: '',
        component: AdminLayout,
        children: [
        { path: '', component: DashboardPage },
        { path: 'conteudo-publico', component: PublicContentPage },
        {
            path: 'diario-do-turno',
            component: PlaceholderPage,
            data: { title: 'Diário do turno' },
        },
        {
            path: 'gerenciar-cadastros',
            component: PlaceholderPage,
            data: { title: 'Gerenciar cadastros' },
        },
        {
            path: 'gerenciar-voluntarios',
            component: PlaceholderPage,
            data: { title: 'Gerenciar voluntários' },
        },
        {
            path: 'gerenciar-unidades-e-turmas',
            component: PlaceholderPage,
            data: { title: 'Gerenciar unidades e turmas' },
        },
        { path: '**', redirectTo: '' },
        ],
    },
    ];*/
