import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-public-navbar',
  standalone: true, 
  imports: [MatButtonModule, RouterLink], 
  templateUrl: './public-navbar.html',
  styleUrl: './public-navbar.css',
})
export class PublicNavbar {
  menuAberto = signal(false);

  constructor(private router: Router) {}

  alternarMenu() {
    this.menuAberto.update(valor => !valor);
  }

  fecharMenu() {
    this.menuAberto.set(false);
  }

  realizarLogin() {
    this.menuAberto.set(false);
    this.router.navigate(['/entrar']);
  }

  navegarParaHomeSection(sectionId: string) {
    this.menuAberto.set(false);

    const rotaAtual = this.router.url.split('?')[0].split('#')[0];

    if (rotaAtual !== '/') {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => this.executarScroll(sectionId), 100);
      });
    } else {
      this.executarScroll(sectionId);
    }
  }

  private executarScroll(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (sectionId === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
