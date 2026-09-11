import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from 'src/app/shared/services/auth/auth';

@Component({
  selector: 'app-private-navbar',
  standalone: true,
  imports: [MatButtonModule, NgClass, NgIf, RouterLink, RouterLinkActive],
  templateUrl: './private-navbar.html',
  styleUrl: './private-navbar.css'
})
export class PrivateNavbar {
  private readonly auth = inject(Auth);

  menuVisivel: boolean = false;
  protected readonly user = this.auth.currentUser;
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

  alternarMenu() {
    this.menuVisivel = !this.menuVisivel;
  }

  fecharMenu() {
    this.menuVisivel = false;
  }

  entrarNoPerfil() {
    console.log('Entra no perfil');
  }
}
