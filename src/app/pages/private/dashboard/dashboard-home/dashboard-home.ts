import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from 'src/app/shared/services/auth/auth';

@Component({
  selector: 'app-dashboard-home',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour > 3 && hour < 12) {
      return 'Bom dia,';
    }

    if (hour >= 12 && hour < 18) {
      return 'Boa tarde,';
    }

    return 'Boa noite,';
  });

  protected readonly userName = computed(() => {
    const user = this.user();
    const rawName = user?.name ?? user?.['nome'];

    if (typeof rawName !== 'string' || !rawName.trim()) {
      return '[user]';
    }

    return rawName
      .replace(/[._-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  });

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
