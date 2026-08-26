import { Routes } from '@angular/router';
import { Home } from './pages/public/home/home';
import { Dashboard } from './pages/private/dashboard/dashboard'; 
import { DashboardHome } from './pages/private/dashboard/dashboard-home/dashboard-home';
import { ContentManagement } from './pages/private/content-management/content-management';
import { canDeactivateGuard } from './guards/can-deactivate.guard';
import { ColaboradorComponent } from '@pages/private/colaborador/colaborador.component';

export const routes: Routes = [
    { path: '', component: Home },
    {
        path: 'dashboard',
        component: Dashboard,
        children: [
            { path: '', component: DashboardHome },
            { path: 'conteudo-publico', component: ContentManagement },
            { path: 'conteudo-publico/:secao', component: ContentManagement },
            { path: 'colaboradores', component: ColaboradorComponent}
        ]
    },
];
