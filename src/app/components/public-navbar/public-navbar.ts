import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-public-navbar',
  standalone: true, 
  imports: [MatButtonModule], 
  templateUrl: './public-navbar.html',
  styleUrl: './public-navbar.css',
})
export class PublicNavbar {
  menuAberto = signal(false);

  constructor(private router: Router) {}

  alternarMenu() {
    this.menuAberto.update(valor => !valor);
  }

  realizarLogin() {
    this.menuAberto.set(false);
    this.router.navigate(['/entrar']);
  }

  scrollTo(sectionId: string) {
    this.menuAberto.set(false);
    
    if (this.router.url !== '/') {
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