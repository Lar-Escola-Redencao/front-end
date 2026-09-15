import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-public-navbar',
  standalone: true, 
  imports: [MatButtonModule, NgIf, RouterLink], 
  templateUrl: './public-navbar.html',
  styleUrl: './public-navbar.css',
})
export class PublicNavbar {
  private readonly elementRef = inject(ElementRef);

  menuAberto = signal(false);

  constructor(private router: Router) {}

  alternarMenu() {
    this.menuAberto.update(valor => !valor);
  }

  abrirMenuMobile() {
    if (window.matchMedia('(max-width: 1000px)').matches) {
      this.menuAberto.set(true);
    }
  }

  fecharMenu() {
    this.menuAberto.set(false);
  }

  @HostListener('document:click', ['$event'])
  aoClicarFora(event: MouseEvent): void {
    if (this.menuAberto() && !this.elementRef.nativeElement.contains(event.target)) {
      this.fecharMenu();
    }
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
