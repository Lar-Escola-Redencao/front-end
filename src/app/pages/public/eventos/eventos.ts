import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Evento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

type FiltroValor = 'todos' | 'gratuito' | 'pago';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    ModalLayout,
    PublicNavbar
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

  paginaAtual = 0;
  tamanhoPagina = 6;
  readonly tamanhosPagina = [6];
  filtrosMobileAberto = false;

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
    this.paginaAtual = 0;
    this.aplicarFiltros();
  }

  buscarMobile(): void {
    this.buscar();
    this.fecharFiltrosMobile();
  }

  limparFiltros(): void {
    this.filtroTitulo = '';
    this.filtroDataInicial = '';
    this.filtroDataFinal = '';
    this.filtroValor = 'todos';
    this.buscar();
  }

  abrirFiltrosMobile(): void {
    this.filtrosMobileAberto = true;
  }

  fecharFiltrosMobile(): void {
    this.filtrosMobileAberto = false;
  }

  @HostListener('window:resize')
  aoRedimensionarJanela(): void {
    if (window.innerWidth > 640 && this.filtrosMobileAberto) {
      this.fecharFiltrosMobile();
    }
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
      this.filtroValor !== 'todos'
    );
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

  private atualizarPagina(): void {
    const inicio = this.paginaAtual * this.tamanhoPagina;
    const fim = inicio + this.tamanhoPagina;

    this.eventosPaginados = this.eventosFiltrados.slice(inicio, fim);
  }
}
