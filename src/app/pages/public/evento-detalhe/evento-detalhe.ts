import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicParceirosComponent } from '@pages/public/home/public-parceiros/public-parceiros';
import { Evento, TipoEvento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

@Component({
  selector: 'app-evento-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicNavbar, PublicFooter, PublicParceirosComponent],
  templateUrl: './evento-detalhe.html',
  styleUrl: './evento-detalhe.css'
})
export class EventoDetalhe implements OnInit {
  private readonly route = inject(ActivatedRoute);
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

  indiceMidiaAtual = 0;
  lightboxAberto = false;

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
