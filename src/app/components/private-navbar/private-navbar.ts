import { Component, ElementRef, HostListener, OnInit, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NgClass, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Modulo } from 'src/app/shared/models/permissao.model';
import { Auth } from 'src/app/shared/services/auth/auth';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';
import { AlterarSenha } from 'src/app/pages/private/alterar-senha/alterar-senha';
import Swal from 'sweetalert2';
import { BloquearScroll } from '../../shared/directives/bloquear-scroll';

@Component({
  selector: 'app-private-navbar',
  standalone: true,
  imports: [MatButtonModule, NgClass, NgIf, RouterLink, RouterLinkActive, AlterarSenha, BloquearScroll],
  templateUrl: './private-navbar.html',
  styleUrl: './private-navbar.css'
})
export class PrivateNavbar implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly perfilService = inject(PerfilService);
  private readonly elementRef = inject(ElementRef);

  menuVisivel = false;
  menuUsuarioAberto = false;
  modalSenhaAberto = false;
  private confirmandoSaida = false;

  protected readonly nomeUsuario = computed(() => this.perfilService.perfilAtual()?.nomeCompleto ?? '');
  protected readonly iniciaisUsuario = computed(() => this.calcularIniciais(this.nomeUsuario()));

  protected podeAcessar(modulo: Modulo): boolean {
    return this.auth.podeAcessar(modulo);
  }

  ngOnInit(): void {
    this.carregarUsuario();
  }

  alternarMenu(): void {
    this.menuVisivel = !this.menuVisivel;
  }

  abrirMenu(): void {
    this.menuVisivel = true;
  }

  fecharMenu() {
    this.menuVisivel = false;
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
    this.fecharMenu();
    this.router.navigateByUrl('/dashboard/perfil');
  }

  abrirAlteracaoSenha(): void {
    this.menuUsuarioAberto = false;
    this.fecharMenu();
    this.modalSenhaAberto = true;
  }

  async sair(): Promise<void> {
    if (this.confirmandoSaida) return;
    this.menuUsuarioAberto = false;
    this.fecharMenu();
    this.confirmandoSaida = true;
    try {
      const resultado = await Swal.fire({
        title: 'Sair do sistema?',
        text: 'Deseja encerrar sua sessão?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sim, sair',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e04b3a',
        reverseButtons: false
      });
      if (!resultado.isConfirmed) return;
      this.auth.logout();
      await this.router.navigateByUrl('/');
    } finally {
      this.confirmandoSaida = false;
    }
  }

  private carregarUsuario(): void {
    this.perfilService.buscarMeuPerfil().subscribe({
      error: () => {}
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
