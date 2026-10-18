import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BarraBusca } from '@components/barra-busca/barra-busca';
import { FiltrosEventosComponent, FiltrosEventos } from '@components/filtros-eventos/filtros-eventos';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Evento, TipoEvento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';
import { PublicFooter } from '@components/public-footer/public-footer';
import { EstadoVazio } from '@components/estado-vazio/estado-vazio';

type FiltroValor = 'todos' | 'gratuito' | 'pago';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    BarraBusca,
    FiltrosEventosComponent,
    PublicNavbar,
    PublicFooter,
    EstadoVazio
  ],
  templateUrl: './eventos.html',
  styleUrl: './eventos.css'
})
export class Eventos implements OnInit {
  eventos: Evento[] = [];
  eventosFiltrados: Evento[] = [];
  eventosPaginados: Evento[] = [];
  carregando = false;

  filtroTitulo = '';
  filtroDataInicial = '';
  filtroDataFinal = '';
  filtroValor: FiltroValor = 'todos';
  filtroTipo: TipoEvento | null = null;

  paginaAtual = 0;
  tamanhoPagina = 6;
  readonly tamanhosPagina = [6];
  readonly tamanhoMinimoTitulo = 3;
  private readonly imagensIndisponiveis = new Set<number>();

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
        this.eventos = [...dados].sort(
          (eventoAtual, proximoEvento) =>
            new Date(proximoEvento.dataEvento).getTime() - new Date(eventoAtual.dataEvento).getTime()
        );
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

  buscar(termo = this.filtroTitulo): void {
    this.filtroTitulo = termo;
    this.paginaAtual = 0;
    this.aplicarFiltros();
  }

  get filtrosAplicados(): FiltrosEventos {
    return { dataInicial: this.filtroDataInicial, dataFinal: this.filtroDataFinal, valor: this.filtroValor, tipo: this.filtroTipo };
  }

  filtrar(filtros: FiltrosEventos): void {
    this.filtroDataInicial = filtros.dataInicial;
    this.filtroDataFinal = filtros.dataFinal;
    this.filtroValor = filtros.valor;
    this.filtroTipo = filtros.tipo;
    this.buscar();
  }

  aplicarFiltros(): void {
    const tituloBruto = this.filtroTitulo.trim();
    const titulo = tituloBruto.length >= this.tamanhoMinimoTitulo ? tituloBruto.toLowerCase() : '';
    const dataInicial = this.filtroDataInicial ? new Date(`${this.filtroDataInicial}T00:00:00`) : null;
    const dataFinal = this.filtroDataFinal ? new Date(`${this.filtroDataFinal}T23:59:59.999`) : null;

    this.eventosFiltrados = this.eventos.filter(evento => {
      const dataEvento = new Date(evento.dataEvento);

      if (titulo && !evento.titulo.toLowerCase().includes(titulo)) {
        return false;
      }

      if (dataInicial && dataEvento < dataInicial) {
        return false;
      }

      if (dataFinal) {
        if (dataEvento > dataFinal) {
          return false;
        }
      }

      if (this.filtroValor === 'gratuito' && evento.valor) {
        return false;
      }

      if (this.filtroValor === 'pago' && !evento.valor) {
        return false;
      }

      return !this.filtroTipo || evento.tipoEvento === this.filtroTipo;
    });

    if (this.paginaAtual >= this.totalPaginas) {
      this.paginaAtual = Math.max(0, this.totalPaginas - 1);
    }

    this.atualizarPagina();
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.eventosFiltrados.length / this.tamanhoPagina));
  }

  get primeiraPaginaSelecionada(): boolean {
    return this.paginaAtual === 0;
  }

  get ultimaPaginaSelecionada(): boolean {
    return this.paginaAtual >= this.totalPaginas - 1;
  }

  get inicioRegistros(): number {
    if (this.eventosFiltrados.length === 0) {
      return 0;
    }

    return this.paginaAtual * this.tamanhoPagina + 1;
  }

  get fimRegistros(): number {
    return Math.min(
      (this.paginaAtual + 1) * this.tamanhoPagina,
      this.eventosFiltrados.length
    );
  }

  get possuiFiltrosAplicados(): boolean {
    return Boolean(
      this.filtroTitulo.trim() ||
      this.filtroDataInicial ||
      this.filtroDataFinal ||
      this.filtroValor !== 'todos' || this.filtroTipo
    );
  }

  get mensagemVazia(): string {
    return this.possuiFiltrosAplicados
      ? 'Nenhum evento encontrado para a busca ou os filtros selecionados.'
      : 'Nenhum evento disponível no momento.';
  }

  irParaPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas) {
      return;
    }

    this.paginaAtual = pagina;
    this.atualizarPagina();
  }

  primeiraPagina(): void {
    this.irParaPagina(0);
  }

  paginaAnterior(): void {
    this.irParaPagina(this.paginaAtual - 1);
  }

  proximaPagina(): void {
    this.irParaPagina(this.paginaAtual + 1);
  }

  ultimaPagina(): void {
    this.irParaPagina(this.totalPaginas - 1);
  }

  eventoEncerrado(evento: Evento): boolean {
    return new Date(evento.dataEvento).getTime() < Date.now();
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

  obterUrlImagem(caminho: string | null | undefined): string {
    return caminho ?? '';
  }

  onEventoImageError(eventoId: number): void {
    this.imagensIndisponiveis.add(eventoId);
  }

  eventoImagemIndisponivel(eventoId: number): boolean {
    return this.imagensIndisponiveis.has(eventoId);
  }

  private atualizarPagina(): void {
    const inicio = this.paginaAtual * this.tamanhoPagina;
    const fim = inicio + this.tamanhoPagina;

    this.eventosPaginados = this.eventosFiltrados.slice(inicio, fim);
  }
}
