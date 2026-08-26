import { Routes } from '@angular/router';
import { DiretoriaComponent } from './components/diretoria/diretoria.component';
import { canDeactivateGuard } from './guards/can-deactivate.guard';

export const routes: Routes = [
  { path: 'diretoria', component: DiretoriaComponent, canDeactivate: [canDeactivateGuard] },
  { path: '', redirectTo: '/diretoria', pathMatch: 'full' }
];
