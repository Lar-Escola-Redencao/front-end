import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Evento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

type FiltroValor = 'todos' | 'gratuito' | 'pago';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicNavbar],
  templateUrl: './eventos.html',
  styleUrl: './eventos.css'
})
export class Eventos implements OnInit {
  eventos: Evento[] = [];
  eventosFiltrados: Evento[] = [];
  carregando = false;

  filtroTitulo = '';
  filtroDataInicial = '';
  filtroDataFinal = '';
  filtroValor: FiltroValor = 'todos';

  paginaAtual = 1;
  readonly itensPorPagina = 5;

  constructor(
    private eventoPublicoService: EventoPublicoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarEventos();
  }

  carregarEventos(): void {
    this.carregando = true;
    this.eventoPublicoService.listarPublicos().subscribe({
      next: (dados) => {
        this.eventos = dados;
        this.aplicarFiltros();
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregando = false;
        this.cdr.detectChanges();
      }
    });
  }

  buscar(): void {
    this.paginaAtual = 1;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const titulo = this.filtroTitulo.trim().toLowerCase();
    const dataInicial = this.filtroDataInicial ? new Date(this.filtroDataInicial) : null;
    const dataFinal = this.filtroDataFinal ? new Date(this.filtroDataFinal) : null;

    this.eventosFiltrados = this.eventos.filter(evento => {
      const dataEvento = new Date(evento.dataEvento);

      if (titulo && !evento.titulo.toLowerCase().includes(titulo)) {
        return false;
      }

      if (dataInicial && dataEvento < dataInicial) {
        return false;
      }

      if (dataFinal) {
        const fimDoDia = new Date(dataFinal);
        fimDoDia.setHours(23, 59, 59, 999);
        if (dataEvento > fimDoDia) {
          return false;
        }
      }

      if (this.filtroValor === 'gratuito' && evento.valor) {
        return false;
      }

      if (this.filtroValor === 'pago' && !evento.valor) {
        return false;
      }

      return true;
    });

    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = Math.max(1, this.totalPaginas);
    }
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.eventosFiltrados.length / this.itensPorPagina));
  }

  get eventosPaginados(): Evento[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.eventosFiltrados.slice(inicio, inicio + this.itensPorPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaAtual = pagina;
  }

  paginaAnterior(): void {
    this.irParaPagina(this.paginaAtual - 1);
  }

  proximaPagina(): void {
    this.irParaPagina(this.paginaAtual + 1);
  }

  formatarDia(data: Date | string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(new Date(data));
  }

  formatarMes(data: Date | string): string {
    const mes = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(data));
    return mes.replace('.', '');
  }

  formatarAno(data: Date | string): string {
    return new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(new Date(data));
  }

  formatarHora(data: Date | string): string {
    const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data));
    return hora.replace(':', 'h');
  }

  formatarValor(evento: Evento): string {
    if (!evento.valor) return 'Gratuito';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(evento.valor);
  }
}
