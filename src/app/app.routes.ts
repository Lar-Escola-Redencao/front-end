import { Routes } from '@angular/router';
import { MembroComponent } from './components/membro/membro.component';
import { canDeactivateGuard } from './guards/can-deactivate.guard';

export const routes: Routes = [
  { path: 'membros', component: MembroComponent, canDeactivate: [canDeactivateGuard] },
  { path: '', redirectTo: '/membros', pathMatch: 'full' }
];
