import { Routes } from '@angular/router';
import { EventoComponent } from './components/evento/evento.component';
import { canDeactivateGuard } from './guards/can-deactivate.guard';

export const routes: Routes = [
  {
    path: 'eventos',
    component: EventoComponent,
    canDeactivate: [canDeactivateGuard]
  }
];
