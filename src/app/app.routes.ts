import { Routes } from '@angular/router';
import { Home } from './pages/public/home/home';
import { About } from './pages/public/about/about';
import { Eventos } from './pages/public/eventos/eventos';
import { EventoDetalhe } from './pages/public/evento-detalhe/evento-detalhe';
import { authGuard } from './shared/guards/auth-guard';
import { guestGuard } from './shared/guards/guest-guard';
import { canDeactivateGuard } from './shared/guards/can-deactivate.guard';
import { roleGuard } from './shared/guards/role-guard';

export const routes: Routes = [
    { path: '', component: Home, canActivate: [guestGuard]},
    { path: 'conheca-a-osc', component: About },
    { path: 'eventos', component: Eventos},
    { path: 'eventos/:id', component: EventoDetalhe},
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/private/dashboard/dashboard').then(m => m.Dashboard),
        children: [
            { path: '', loadComponent: () => import('./pages/private/dashboard/dashboard-home/dashboard-home').then(m => m.DashboardHome) },
            { path: 'conteudo-publico', loadComponent: () => import('./pages/private/content-management/content-management').then(m => m.ContentManagement), canActivate: [roleGuard], data: { modulo: 'conteudo-publico' } },
            { path: 'conteudo-publico/:secao', loadComponent: () => import('./pages/private/content-management/content-management').then(m => m.ContentManagement), canActivate: [roleGuard], data: { modulo: 'conteudo-publico' } },
            { path: 'colaboradores', loadComponent: () => import('@pages/private/colaborador/colaborador.component').then(m => m.ColaboradorComponent), canActivate: [roleGuard], data: { modulo: 'colaboradores' } },
            { path: 'usuarios', canDeactivate: [canDeactivateGuard], loadComponent: () => import('@pages/private/usuario/usuario.component').then(m => m.UsuarioComponent), canActivate: [roleGuard], data: { modulo: 'usuarios' } },
            { path: 'usuarios/:id', loadComponent: () => import('@pages/private/usuario/usuario-perfil/usuario-perfil').then(m => m.UsuarioPerfil), canActivate: [roleGuard], data: { modulo: 'perfil-usuario' } },
            { path: 'diario', canDeactivate: [canDeactivateGuard], loadComponent: () => import('@pages/private/diario/diario').then(m => m.Diario), canActivate: [roleGuard], data: { modulo: 'diario' } },
            { path: 'unidades-turmas', loadComponent: () => import('@pages/private/unidades-turmas/unidades-turmas').then(m => m.UnidadesTurmas), canActivate: [roleGuard], data: { modulo: 'unidades-turmas' } },
            { path: 'perfil', loadComponent: () => import('@pages/private/perfil/perfil').then(m => m.Perfil)}
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
