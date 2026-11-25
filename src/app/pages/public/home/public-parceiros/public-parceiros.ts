import { ErroCarregamento } from '@components/erro-carregamento/erro-carregamento';
import { EstadoVazio } from '@components/estado-vazio/estado-vazio';
import { Component, OnInit, OnDestroy, OnChanges, Input, Output, EventEmitter, HostListener, inject, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BloquearScroll } from 'src/app/shared/directives/bloquear-scroll';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

export interface ParceiroExibicao {
  id: number;
  nome: string;
  logo: string;
}

@Component({
  selector: 'app-public-parceiros',
  standalone: true,
  imports: [ErroCarregamento, EstadoVazio, CommonModule, BloquearScroll],
  templateUrl: './public-parceiros.html',
  styleUrl: './public-parceiros.css'
})
export class PublicParceirosComponent implements OnInit, OnChanges, OnDestroy {
  @Output() carregado = new EventEmitter<boolean>();
  private readonly publicContentService = inject(PublicContentService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Título exibido acima do carrossel. */
  @Input() titulo = 'Nossos parceiros';

  /**
   * Lista de parceiros a exibir. Quando informada, o componente usa exatamente
   * esses parceiros (sem buscar nem filtrar por `ativo`) — usado, por exemplo,
   * na tela de detalhe do evento, onde parceiros inativos também devem aparecer
   * para preservar o histórico institucional. Quando omitida, o componente busca
   * os parceiros ativos cadastrados no site (comportamento da home).
   */
  @Input() parceiros: ParceiroExibicao[] | null = null;

  parceirosOriginal: ParceiroExibicao[] = [];
  parceirosCarousel: ParceiroExibicao[] = [];
  carregando = false;
  erroCarregamento = false;
  parceiroAmpliado: ParceiroExibicao | null = null;
  @ViewChild('lightbox') private lightboxRef?: ElementRef<HTMLDialogElement>;
  private readonly imagensIndisponiveis = new Set<number>();

  currentIndex = 0;
  itemsPerPage = 3;

  isTransitioning = true;
  isAnimating = false;
  private autoPlayInterval: any;

  ngOnInit(): void {
    this.atualizarItemsPerPage();
    this.carregar();
  }

  carregar(): void {
    if (this.carregando) return;
    this.stopAutoPlay();
    this.carregando = true;
    this.erroCarregamento = false;
    if (this.parceiros) {
      this.definirParceiros(this.parceiros);
      return;
    }

    this.publicContentService.getParceirosAtivos().subscribe({
      next: (dados) => {
        this.definirParceiros(dados);
      },
      error: () => {
        this.erroCarregamento = true;
        this.carregando = false;
        this.cdr.detectChanges();
        this.carregado.emit(false);
      }
    });
  }

  ngOnChanges(): void {
    if (this.parceiros) {
      this.definirParceiros(this.parceiros);
    }
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.atualizarItemsPerPage();
    this.cdr.detectChanges();
  }

  atualizarItemsPerPage(): void {
    const width = window.innerWidth;
    if (width < 600) {
      this.itemsPerPage = 1;
    } else if (width < 900) {
      this.itemsPerPage = 2;
    } else {
      this.itemsPerPage = 3;
    }
  }

  private definirParceiros(dados: ParceiroExibicao[]): void {
    this.imagensIndisponiveis.clear();
    this.erroCarregamento = false;
    this.parceirosOriginal = dados;
    if (dados.length > 1) {
      this.parceirosCarousel = [...dados, ...dados, ...dados, ...dados, ...dados];
      this.currentIndex = dados.length * 2;
    } else {
      this.parceirosCarousel = [...dados];
      this.currentIndex = 0;
    }
    this.carregando = false;
    this.cdr.detectChanges();
    this.startAutoPlay();
    this.carregado.emit(true);
  }

  obterUrlImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

  podeAmpliar(parceiro: ParceiroExibicao): boolean {
    return !!this.obterUrlImagem(parceiro.logo) && !this.imagensIndisponiveis.has(parceiro.id);
  }

  onImageError(parceiro: ParceiroExibicao): void {
    this.imagensIndisponiveis.add(parceiro.id);
  }

  abrirImagem(parceiro: ParceiroExibicao): void {
    if (!this.podeAmpliar(parceiro)) return;
    this.parceiroAmpliado = parceiro;
    this.stopAutoPlay();
    this.cdr.detectChanges();
    this.lightboxRef?.nativeElement.showModal();
  }

  fecharImagem(): void {
    this.lightboxRef?.nativeElement.close();
  }

  aoFecharImagem(): void {
    this.parceiroAmpliado = null;
    this.startAutoPlay();
  }

  fecharAoClicarFora(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.fecharImagem();
  }

  startAutoPlay(): void {
    this.stopAutoPlay();
    if (this.parceirosOriginal.length > 1 && !this.parceiroAmpliado) {
      this.autoPlayInterval = setInterval(() => {
        this.next();
        this.cdr.detectChanges();
      }, 3000);
    }
  }

  stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  next(): void {
    if (this.parceirosOriginal.length <= 1 || this.isAnimating) return;
    this.isAnimating = true;
    this.currentIndex++;

    setTimeout(() => {
      if (this.currentIndex >= this.parceirosOriginal.length * 3) {
        this.resetPosition(this.currentIndex - this.parceirosOriginal.length);
      } else {
        this.isAnimating = false;
      }
    }, 500);
  }

  prev(): void {
    if (this.parceirosOriginal.length <= 1 || this.isAnimating) return;
    this.isAnimating = true;
    this.currentIndex--;

    setTimeout(() => {
      if (this.currentIndex <= this.parceirosOriginal.length) {
        this.resetPosition(this.currentIndex + this.parceirosOriginal.length);
      } else {
        this.isAnimating = false;
      }
    }, 500);
  }

  private resetPosition(newIndex: number): void {
    this.isTransitioning = false;
    this.cdr.detectChanges();

    this.currentIndex = newIndex;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.isTransitioning = true;
      this.isAnimating = false;
      this.cdr.detectChanges();
    }, 30);
  }

  get trackTransform(): string {
    if (this.itemsPerPage === 1) {
      return `translateX(-${this.currentIndex * 100}%)`;
    }
    const itemWidth = 100 / this.itemsPerPage;
    const offset = (-this.currentIndex * itemWidth) + ((100 - itemWidth) / 2);
    return `translateX(${offset}%)`;
  }
}
