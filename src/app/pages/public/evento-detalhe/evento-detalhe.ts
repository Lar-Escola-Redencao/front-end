import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { Evento, Parceiro, TipoEvento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

@Component({
  selector: 'app-evento-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicNavbar, PublicFooter],
  templateUrl: './evento-detalhe.html',
  styleUrl: './evento-detalhe.css'
})
export class EventoDetalhe implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly eventoPublicoService = inject(EventoPublicoService);
  private readonly publicContentService = inject(PublicContentService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly nomesTipoEvento: Record<TipoEvento, string> = {
    [TipoEvento.ARRECADACAO]: 'Arrecadação',
    [TipoEvento.CULTURAL]: 'Cultural',
    [TipoEvento.COMEMORATIVO]: 'Comemorativo'
  };

  evento: Evento | null = null;
  carregando = true;
  naoEncontrado = false;

  indiceMidiaAtual = 0;
  lightboxAberto = false;
  indiceParceiroAtual = 0;
  parceirosEmTransicao = true;
  parceirosAnimando = false;
  private parceirosAutoPlayInterval: number | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.carregando = false;
      this.naoEncontrado = true;
      return;
    }

    this.eventoPublicoService.buscarPorId(id).subscribe({
      next: (evento) => {
        this.evento = evento;
        this.iniciarAutoPlayParceiros();
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregando = false;
        this.naoEncontrado = true;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.pararAutoPlayParceiros();
    document.body.style.overflow = '';
  }

  // Imagem principal do evento seguida das mídias extras (`midiaEvento`).
  // TODO: `midiaEvento` ainda não existe no back-end (ver evento.model.ts) — hoje
  // este array sempre terá no máximo 1 item, então o carrossel fica desabilitado
  // e é exibida apenas a imagem estática, como pedido.
  get midias(): string[] {
    if (!this.evento?.imagem) return [];
    return [this.evento.imagem, ...(this.evento.midiaEvento ?? [])];
  }

  get possuiCarrossel(): boolean {
    return this.midias.length > 1;
  }

  get midiaAtual(): string {
    return this.midias[this.indiceMidiaAtual] ?? '';
  }

  get parceiros(): Parceiro[] {
    return this.evento?.parceiros ?? [];
  }

  get possuiCarrosselParceiros(): boolean {
    return this.parceiros.length >= 3;
  }

  get parceirosCarousel(): Parceiro[] {
    if (!this.possuiCarrosselParceiros) return this.parceiros;
    return [...this.parceiros, ...this.parceiros, ...this.parceiros];
  }

  get parceirosPorPagina(): number {
    return window.innerWidth <= 360 ? 1 : 3;
  }

  get parceiroTrackTransform(): string {
    if (!this.possuiCarrosselParceiros) return 'translateX(0)';
    const itemWidth = 100 / this.parceirosPorPagina;
    return `translateX(-${this.indiceParceiroAtual * itemWidth}%)`;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.cdr.detectChanges();
  }

  selecionarMidia(indice: number): void {
    this.indiceMidiaAtual = indice;
  }

  proximaMidia(): void {
    const total = this.midias.length;
    if (total <= 1) return;
    this.indiceMidiaAtual = (this.indiceMidiaAtual + 1) % total;
  }

  midiaAnterior(): void {
    const total = this.midias.length;
    if (total <= 1) return;
    this.indiceMidiaAtual = (this.indiceMidiaAtual - 1 + total) % total;
  }

  abrirLightbox(): void {
    if (!this.midiaAtual) return;
    this.lightboxAberto = true;
    document.body.style.overflow = 'hidden';
  }

  fecharLightbox(): void {
    this.lightboxAberto = false;
    document.body.style.overflow = '';
  }

  proximoParceiro(): void {
    if (!this.possuiCarrosselParceiros || this.parceirosAnimando) return;
    this.parceirosAnimando = true;
    this.indiceParceiroAtual++;

    if (this.indiceParceiroAtual >= this.parceiros.length * 2) {
      setTimeout(() => {
        this.parceirosEmTransicao = false;
        this.indiceParceiroAtual = this.parceiros.length;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.parceirosEmTransicao = true;
          this.parceirosAnimando = false;
          this.cdr.detectChanges();
        }, 30);
      }, 500);
      return;
    }

    setTimeout(() => {
      this.parceirosAnimando = false;
      this.cdr.detectChanges();
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
        this.cdr.detectChanges();

        setTimeout(() => {
          this.parceirosEmTransicao = true;
          this.parceirosAnimando = false;
          this.cdr.detectChanges();
        }, 30);
      }, 500);
      return;
    }

    setTimeout(() => {
      this.parceirosAnimando = false;
      this.cdr.detectChanges();
    }, 500);
  }

  iniciarAutoPlayParceiros(): void {
    this.pararAutoPlayParceiros();
    if (!this.possuiCarrosselParceiros) {
      this.indiceParceiroAtual = 0;
      return;
    }

    this.indiceParceiroAtual = this.parceiros.length;
    this.parceirosAutoPlayInterval = window.setInterval(() => {
      this.proximoParceiro();
      this.cdr.detectChanges();
    }, 3000);
  }

  pararAutoPlayParceiros(): void {
    if (this.parceirosAutoPlayInterval) {
      window.clearInterval(this.parceirosAutoPlayInterval);
      this.parceirosAutoPlayInterval = null;
    }
  }

  obterUrlImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

  onParceiroImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.nextElementSibling?.classList.remove('imagem-fallback-hidden');
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
