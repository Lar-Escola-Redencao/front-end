import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from 'src/app/shared/services/auth/auth';

@Component({
  selector: 'app-dashboard-home',
  imports: [],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
