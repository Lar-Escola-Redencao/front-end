import { Routes } from '@angular/router';
import { Home } from './pages/public/home/home';
import { About } from './pages/public/about/about';
import { Eventos } from './pages/public/eventos/eventos';
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
    { path: 'conheca-a-osc', component: About },
    { path: 'eventos', component: Eventos},
    {
        path: 'dashboard',
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
    {
        path: 'recuperar-senha',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/public/recuperar-senha/recuperar-senha').then((m) => m.RecuperarSenha),
    },
    {
        path: 'transparencia',
        loadComponent: () => import('./pages/public/transparencia/transparencia').then((m) => m.Transparencia),
    },
    { path: '**', redirectTo: '' }
];