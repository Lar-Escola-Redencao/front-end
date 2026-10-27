import { Component, ElementRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { Location } from '@angular/common';

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
  imports: [PublicNavbar, PublicFooter],
  templateUrl: './como-ajudar.html',
  styleUrl: './como-ajudar.css',
})
export class ComoAjudar implements OnInit {
  private readonly secoesGrupoService = inject(SecoesGrupoService);
  private readonly publicContentService = inject(PublicContentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly clipboard = inject(Clipboard);
  private readonly location = inject(Location);
  private copiaTimer?: ReturnType<typeof setTimeout>;

  protected readonly pix = signal<SecaoGrupo | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erroCarregamento = signal(false);
  protected readonly erroImagem = signal(false);
  protected readonly chaveCopiada = signal(false);
  protected readonly feedbackCopia = signal('');

  protected readonly imagemPix = computed(() =>
    this.publicContentService.tratarUrlImagem(this.pix()?.imagem),
  );

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.copiaTimer));
  }

  ngOnInit(): void {
    this.carregarPix();
  }

  protected carregarPix(): void {
    clearTimeout(this.copiaTimer);
    this.chaveCopiada.set(false);
    this.feedbackCopia.set('');
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

  protected copiarChavePix(): void {
    const chave = this.pix()?.conteudo?.trim();
    if (!chave) return;
    clearTimeout(this.copiaTimer);
    const copiou = this.clipboard.copy(chave);
    this.chaveCopiada.set(copiou);
    this.feedbackCopia.set(copiou ? 'Chave Pix copiada!' : 'Não foi possível copiar. Selecione a chave para copiar.');
    if (copiou) {
      this.copiaTimer = setTimeout(() => {
        this.chaveCopiada.set(false);
        this.feedbackCopia.set('');
      }, 2500);
    }
  }

  protected irParaPix(evento: MouseEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
    const secao = this.elemento.nativeElement.querySelector<HTMLElement>('#pix');
    const janela = secao?.ownerDocument.defaultView;
    if (!secao || !janela) return;

    // Atualiza o fragmento sem substituir a posição calculada pela navegação nativa.
    evento.preventDefault();
    this.location.go('/como-ajudar#pix', '', this.location.getState());
    const navbar = this.elemento.nativeElement.querySelector<HTMLElement>('app-public-navbar .navbar');
    const alturaNav = navbar?.getBoundingClientRect().bottom ?? 82;
    const topo = secao.getBoundingClientRect().top + janela.scrollY - alturaNav - 8;
    janela.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' });
  }
}
