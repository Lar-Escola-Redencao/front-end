import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { Evento, Parceiro, TipoEvento } from 'src/app/shared/models/evento.model';
import { SocialLink } from 'src/app/shared/models/social-link.model';
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
  redesSociais: SocialLink[] = [];
  carregando = true;
  naoEncontrado = false;

  imagemPrincipalIndisponivel = false;
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

    forkJoin({
      evento: this.eventoPublicoService.buscarPorId(id),
      redesSociais: this.publicContentService.getRedesSociaisAtivas()
    }).subscribe({
      next: ({ evento, redesSociais }) => {
        this.evento = evento;
        this.redesSociais = redesSociais;
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
  }

  get imagemPrincipal(): string {
    return this.evento?.imagem ?? '';
  }

  get possuiRedesSociais(): boolean {
    return this.redesSociais.length > 0;
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

  onImagemPrincipalError(): void {
    this.imagemPrincipalIndisponivel = true;
  }

  onIconeRedeError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.nextElementSibling?.classList.remove('rede-social-fallback-hidden');
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
