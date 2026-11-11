import { Component, ElementRef, HostListener, Injector, afterNextRender, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { BloquearScroll } from '../../shared/directives/bloquear-scroll';

@Component({
  selector: 'app-public-navbar',
  standalone: true, 
  imports: [MatButtonModule, NgIf, RouterLink, RouterLinkActive, BloquearScroll],
  templateUrl: './public-navbar.html',
  styleUrl: './public-navbar.css',
})
export class PublicNavbar {
  private readonly elementRef = inject(ElementRef);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly urlAtual = toSignal(this.router.events.pipe(
    filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
    map(evento => evento.urlAfterRedirects),
  ), { initialValue: this.router.url });

  menuAberto = signal(false);

  homeAtiva(secao: string): boolean {
    const url = this.router.parseUrl(this.urlAtual());
    if (url.root.children['primary']?.segments.length) return false;
    const fragmento = url.fragment === 'unidades' || url.fragment === 'parceiros' ? url.fragment : 'inicio';
    return fragmento === secao;
  }

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
      this.router.navigate(['/'], { fragment: sectionId }).then(() => {
        setTimeout(() => this.executarScroll(sectionId), 100);
      });
    } else {
      void this.router.navigate(['/'], { fragment: sectionId });
      // Aguarda a remoção do overlay e a restauração da posição da página.
      afterNextRender(() => this.executarScroll(sectionId), { injector: this.injector });
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
