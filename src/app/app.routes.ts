import { Routes } from '@angular/router';
import { MembroComponent } from './components/membro/membro.component';

export const routes: Routes = [
  { path: 'membros', component: MembroComponent },
  { path: '', redirectTo: '/membros', pathMatch: 'full' }
];
