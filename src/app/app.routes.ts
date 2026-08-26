import { Routes } from '@angular/router';
import { Home } from './pages/public/home/home';
import { Dashboard } from './pages/private/dashboard/dashboard'; 

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'dashboard', component: Dashboard }
];