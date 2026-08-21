import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-backoffice-home',
  imports: [],
  templateUrl: './backoffice-home.html',
  styleUrl: './backoffice-home.css',
})
export class BackofficeHome {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
