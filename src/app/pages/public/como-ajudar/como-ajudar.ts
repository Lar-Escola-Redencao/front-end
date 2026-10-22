import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';

import {
  GRUPOS_SECAO,
  ID_PAGINA_PIX,
} from 'src/app/shared/services/pagina/secoes-grupo.contrato';
import {
  SecaoGrupo,
  SecoesGrupoService,
} from 'src/app/shared/services/pagina/secoes-grupo.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

@Component({
  selector: 'app-como-ajudar',
  standalone: true,
  imports: [PublicNavbar, PublicFooter, RouterLink],
  templateUrl: './como-ajudar.html',
  styleUrl: './como-ajudar.css',
})
export class ComoAjudar implements OnInit {
  private readonly secoesGrupoService = inject(SecoesGrupoService);
  private readonly publicContentService = inject(PublicContentService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pix = signal<SecaoGrupo | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erroCarregamento = signal(false);
  protected readonly erroImagem = signal(false);

  protected readonly imagemPix = computed(() =>
    this.publicContentService.tratarUrlImagem(this.pix()?.imagem),
  );

  ngOnInit(): void {
    this.carregarPix();
  }

  protected carregarPix(): void {
    this.carregando.set(true);
    this.erroCarregamento.set(false);
    this.erroImagem.set(false);
    this.pix.set(null);

    this.secoesGrupoService
      .listarPorGrupo(ID_PAGINA_PIX, GRUPOS_SECAO.pix)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (secoes) => {
          this.pix.set(secoes.find((secao) => secao.ativo === true) ?? null);
          this.carregando.set(false);
        },
        error: () => {
          this.erroCarregamento.set(true);
          this.carregando.set(false);
        },
      });
  }

  protected marcarErroImagem(): void {
    this.erroImagem.set(true);
  }
}
