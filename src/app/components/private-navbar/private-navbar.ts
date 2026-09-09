import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NgClass, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Auth } from 'src/app/shared/services/auth/auth';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';

@Component({
  selector: 'app-private-navbar',
  standalone: true,
  imports: [MatButtonModule, NgClass, NgIf, RouterLink, RouterLinkActive],
  templateUrl: './private-navbar.html',
  styleUrl: './private-navbar.css'
})
export class PrivateNavbar implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly perfilService = inject(PerfilService);
  private readonly elementRef = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  menuVisivel = false;
  menuUsuarioAberto = false;

  nomeUsuario = '';
  iniciaisUsuario = '';

  ngOnInit(): void {
    this.carregarUsuario();
  }

  alternarMenu(): void {
    this.menuVisivel = !this.menuVisivel;
  }

  alternarMenuUsuario(): void {
    this.menuUsuarioAberto = !this.menuUsuarioAberto;
  }

  @HostListener('document:click', ['$event'])
  aoClicarFora(event: MouseEvent): void {
    if (this.menuUsuarioAberto && !this.elementRef.nativeElement.contains(event.target)) {
      this.menuUsuarioAberto = false;
    }
  }

  irParaPerfil(): void {
    this.menuUsuarioAberto = false;
    this.router.navigateByUrl('/dashboard/perfil');
  }

  sair(): void {
    this.menuUsuarioAberto = false;
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  private carregarUsuario(): void {
    this.perfilService.buscarMeuPerfil().subscribe({
      next: (perfil) => {
        this.ngZone.run(() => {
          this.nomeUsuario = perfil.nomeCompleto;
          this.iniciaisUsuario = this.calcularIniciais(perfil.nomeCompleto);
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.iniciaisUsuario = '';
          this.cdr.detectChanges();
        });
      }
    });
  }

  private calcularIniciais(nomeCompleto: string): string {
    const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);

    if (partes.length === 0) {
      return '';
    }

    const primeira = partes[0].charAt(0);
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';

    return (primeira + ultima).toUpperCase();
  }
}
