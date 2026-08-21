import { Routes } from '@angular/router';
import { AdminLayout } from './core/layout/admin-layout/admin-layout';
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
];
