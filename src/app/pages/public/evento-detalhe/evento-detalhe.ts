import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { Evento, EventoRedeSocial, Parceiro, TipoEvento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

@Component({
  selector: 'app-evento-detalhe',
  standalone: true,
  imports: [CommonModule, PublicNavbar, PublicFooter],
  templateUrl: './evento-detalhe.html',
  styleUrl: './evento-detalhe.css'
})
export class EventoDetalhe implements OnInit, OnDestroy {
  @Input() modoPreview = false;
  @Input() eventoId: number | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventoPublicoService = inject(EventoPublicoService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly nomesTipoEvento: Record<TipoEvento, string> = {
    [TipoEvento.ARRECADACAO]: 'Arrecadação',
    [TipoEvento.CULTURAL]: 'Cultural',
    [TipoEvento.COMEMORATIVO]: 'Comemorativo'
  };

  evento: Evento | null = null;
  carregando = true;
  naoEncontrado = false;

  imagemPrincipalIndisponivel = false;
  lightboxAberto = false;
  indiceParceiroAtual = 0;
  parceirosEmTransicao = true;
  parceirosAnimando = false;
  private parceirosAutoPlayInterval: number | null = null;
  private returnUrl: string | null = null;
  private janelaParceiros?: HTMLElement;
  private parceirosResizeObserver?: ResizeObserver;
  private quantidadeParceirosVisiveis = 3;
  private larguraDisponivelParceiros = 0;

  @ViewChild('parceirosJanela')
  set parceirosJanela(elemento: ElementRef<HTMLElement> | undefined) {
    this.parceirosResizeObserver?.disconnect();
    this.janelaParceiros = elemento?.nativeElement;
    if (!this.janelaParceiros) return;
    if (typeof ResizeObserver !== 'undefined') {
      this.parceirosResizeObserver = new ResizeObserver(() => this.ajustarParceirosVisiveis());
      this.parceirosResizeObserver.observe(this.janelaParceiros);
      if (this.janelaParceiros.parentElement) {
        this.parceirosResizeObserver.observe(this.janelaParceiros.parentElement);
      }
    }
    queueMicrotask(() => {
      if (!this.destroyRef.destroyed) this.ajustarParceirosVisiveis();
    });
  }

  private ajustarParceirosVisiveis(): void {
    const largura = this.janelaParceiros?.clientWidth ?? 0;
    if (largura <= 0 || this.destroyRef.destroyed) return;
    const tinhaCarrossel = this.possuiCarrosselParceiros;
    // Mede o contêiner completo: as setas reduzem a janela ao aparecer e
    // não podem fazer o carrossel alternar indefinidamente entre os modos.
    this.larguraDisponivelParceiros = this.janelaParceiros?.parentElement?.clientWidth || largura;
    const quantidade = Math.max(1, Math.min(3, Math.floor(largura / 112)));
    const mudouModo = tinhaCarrossel !== this.possuiCarrosselParceiros;
    if (quantidade === this.quantidadeParceirosVisiveis && !mudouModo) return;
    this.quantidadeParceirosVisiveis = quantidade;
    if (mudouModo) this.iniciarAutoPlayParceiros();
    this.atualizarTela();
  }

  ngOnInit(): void {
    this.returnUrl = this.modoPreview ? null : this.obterReturnUrl();
    const id = this.modoPreview ? this.eventoId : Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.carregando = false;
      this.naoEncontrado = true;
      return;
    }

    this.eventoPublicoService.buscarPorId(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (evento) => {
        this.evento = evento;
        this.iniciarAutoPlayParceiros();
        this.carregando = false;
        this.atualizarTela();
      },
      error: () => {
        this.carregando = false;
        this.naoEncontrado = true;
        this.atualizarTela();
      }
    });
  }

  private atualizarTela(): void {
    if (!this.destroyRef.destroyed) this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.parceirosResizeObserver?.disconnect();
    this.pararAutoPlayParceiros();
    if (!this.modoPreview) document.body.style.overflow = '';
  }

  get imagemPrincipal(): string {
    return this.evento?.imagem ?? '';
  }

  get redesSociais(): EventoRedeSocial[] {
    return this.evento?.redesSociais ?? [];
  }

  // O overlay "acompanhe pelas redes" só faz sentido depois que o evento
  // encerrou e existe ao menos uma rede social (com ícone) cadastrada para divulgar.
  get exibirOverlayRedesSociais(): boolean {
    return this.eventoEncerrado() && this.redesSociais.length > 0;
  }

  get exibirOverlayEventoEncerrado(): boolean {
    return this.eventoEncerrado() && this.redesSociais.length === 0;
  }

  get parceiros(): Parceiro[] {
    return this.evento?.parceiros ?? [];
  }

  get possuiCarrosselParceiros(): boolean {
    if (this.parceiros.length < 2) return false;
    if (this.parceiros.length >= 3) return true;
    const larguraCard = this.modoPreview || window.innerWidth <= 640 ? 112 : 136;
    return this.larguraDisponivelParceiros > 0
      && this.larguraDisponivelParceiros < larguraCard * 2 + 16;
  }

  get parceirosCarousel(): Parceiro[] {
    if (!this.possuiCarrosselParceiros) return this.parceiros;
    return [...this.parceiros, ...this.parceiros, ...this.parceiros];
  }

  get parceirosPorPagina(): number {
    return Math.max(1, Math.min(this.parceiros.length, this.quantidadeParceirosVisiveis));
  }

  get parceiroTrackTransform(): string {
    if (!this.possuiCarrosselParceiros) return 'translateX(0)';
    const itemWidth = 100 / this.parceirosPorPagina;
    return `translateX(-${this.indiceParceiroAtual * itemWidth}%)`;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.ajustarParceirosVisiveis();
    this.atualizarTela();
  }

  proximoParceiro(): void {
    if (!this.possuiCarrosselParceiros || this.parceirosAnimando) return;
    this.parceirosAnimando = true;
    this.indiceParceiroAtual++;

    if (this.indiceParceiroAtual >= this.parceiros.length * 2) {
      setTimeout(() => {
        this.parceirosEmTransicao = false;
        this.indiceParceiroAtual = this.parceiros.length;
        this.atualizarTela();

        setTimeout(() => {
          this.parceirosEmTransicao = true;
          this.parceirosAnimando = false;
          this.atualizarTela();
        }, 30);
      }, 500);
      return;
    }

    setTimeout(() => {
      this.parceirosAnimando = false;
      this.atualizarTela();
    }, 500);
  }

  parceiroAnterior(): void {
    if (!this.possuiCarrosselParceiros || this.parceirosAnimando) return;
    this.parceirosAnimando = true;
    this.indiceParceiroAtual--;

    if (this.indiceParceiroAtual < this.parceiros.length) {
      setTimeout(() => {
        this.parceirosEmTransicao = false;
        this.indiceParceiroAtual = this.parceiros.length * 2 - 1;
        this.atualizarTela();

        setTimeout(() => {
          this.parceirosEmTransicao = true;
          this.parceirosAnimando = false;
          this.atualizarTela();
        }, 30);
      }, 500);
      return;
    }

    setTimeout(() => {
      this.parceirosAnimando = false;
      this.atualizarTela();
    }, 500);
  }

  iniciarAutoPlayParceiros(): void {
    this.pararAutoPlayParceiros();
    this.indiceParceiroAtual = this.possuiCarrosselParceiros ? this.parceiros.length : 0;
    if (!this.possuiCarrosselParceiros) return;
    this.parceirosAutoPlayInterval = window.setInterval(() => {
      this.proximoParceiro();
      this.atualizarTela();
    }, 3000);
  }

  pararAutoPlayParceiros(): void {
    if (this.parceirosAutoPlayInterval) {
      window.clearInterval(this.parceirosAutoPlayInterval);
      this.parceirosAutoPlayInterval = null;
    }
  }

  voltar(): void {
    this.router.navigateByUrl(this.returnUrl ?? '/eventos');
  }

  obterUrlImagem(caminho: string | null | undefined): string {
    return this.eventoPublicoService.tratarImagem(caminho);
  }

  onParceiroImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.nextElementSibling?.classList.remove('imagem-fallback-hidden');
  }

  onImagemPrincipalError(): void {
    this.imagemPrincipalIndisponivel = true;
  }

  abrirLightbox(): void {
    if (!this.imagemPrincipal || this.imagemPrincipalIndisponivel) return;
    this.lightboxAberto = true;
    if (!this.modoPreview) document.body.style.overflow = 'hidden';
  }

  fecharLightbox(): void {
    this.lightboxAberto = false;
    if (!this.modoPreview) document.body.style.overflow = '';
  }

  onIconeRedeError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.nextElementSibling?.classList.remove('rede-social-fallback-hidden');
  }

  private obterReturnUrl(): string | null {
    const valor = this.route.snapshot.queryParamMap?.get('returnUrl');
    return valor?.startsWith('/') ? valor : null;
  }

  eventoEncerrado(): boolean {
    if (!this.evento) return false;
    return new Date(this.evento.dataEvento).getTime() < Date.now();
  }

  formatarData(data: Date | string): string {
    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(data));

    const horaFormatada = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(data)).replace(':', 'h');

    return `${dataFormatada} às ${horaFormatada}`;
  }

  formatarValor(): string {
    if (!this.evento?.valor) return 'Gratuito';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.evento.valor);
  }

  formatarTipo(tipo: TipoEvento): string {
    return this.nomesTipoEvento[tipo] ?? tipo;
  }
}
