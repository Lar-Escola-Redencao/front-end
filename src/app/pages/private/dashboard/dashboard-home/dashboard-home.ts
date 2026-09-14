import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from 'src/app/shared/services/auth/auth';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';

@Component({
  selector: 'app-dashboard-home',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly perfilService = inject(PerfilService);

  protected readonly user = this.auth.currentUser;
  protected readonly perfil = this.perfilService.perfilAtual;
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
    const perfil = this.perfil();
    const user = this.user();
    const rawName = perfil?.nomeCompleto ?? user?.name ?? user?.['nome'];

    if (typeof rawName !== 'string' || !rawName.trim()) {
      return '';
    }

    return rawName
      .replace(/[._-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 1)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  });

  ngOnInit(): void {
    if (!this.perfil()) {
      this.perfilService.buscarMeuPerfil().subscribe();
    }
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
