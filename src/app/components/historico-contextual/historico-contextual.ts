import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Subscription, catchError, forkJoin, map, merge, of, switchMap } from 'rxjs';
import { ModalLayout } from '../modal-layout/modal-layout';
import { HistoricoDetalheComponent } from '../historico-detalhe/historico-detalhe';
import { AtividadeHistorico, FiltrosHistorico, TipoRegistroHistorico } from '../../shared/models/historico.model';
import { HistoricoService } from '../../shared/services/historico/historico.service';
import { Auth } from '../../shared/services/auth/auth';

@Component({
  selector: 'app-historico-contextual',
  standalone: true,
  imports: [DatePipe, MatIconModule, MatTooltipModule, RouterLink, ModalLayout, HistoricoDetalheComponent],
  templateUrl: './historico-contextual.html',
  styleUrl: './historico-contextual.css'
})
export class HistoricoContextual implements OnInit, OnChanges, OnDestroy {
  @Input() tipo: TipoRegistroHistorico | null = null;
  @Input() idRegistro: number | null = null;
  @Input() idUsuario: number | null = null;
  @Input() idTurma: number | null = null;
  @Input() idContato: number | null = null;
  @Input() dataAula = '';
  @Input() titulo = 'Histórico de alterações';
  @Input() diario = false;
  @Input() mostrarRegistro = false;
  abaDiario: TipoRegistroHistorico = 'PRESENCAS';
  readonly auth = inject(Auth);
  private readonly service = inject(HistoricoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private monitoramento?: Subscription;
  private consulta?: Subscription;
  private leitura?: Subscription;
  private iniciado = false;
  aberto = false;
  carregando = false;
  erro = false;
  erroLeitura = false;
  temNovidades = false;
  atividadesNovas = new Set<number>();
  atividades: AtividadeHistorico[] = [];
  atividadeSelecionada: AtividadeHistorico | null = null;

  get tipoConsulta(): TipoRegistroHistorico | null {
    return this.diario ? this.abaDiario : this.tipo;
  }

  get filtros(): FiltrosHistorico {
    return { idRegistro: this.idRegistro, idUsuario: this.idUsuario,
      idTurma: this.idTurma, idContato: this.idContato,
      dataAula: this.diario && this.abaDiario === 'OCORRENCIAS' ? '' : this.dataAula, periodo: 'TODOS' };
  }

  get parametrosPagina(): Record<string, string | number | null | undefined> {
    return { ...this.filtros, tipoRegistro: this.tipoConsulta ?? 'TODOS' };
  }

  ngOnInit(): void {
    this.iniciado = true;
    this.monitorar();
  }

  ngOnChanges(): void {
    if (this.iniciado) {
      this.aberto = false;
      this.atividadeSelecionada = null;
      this.consulta?.unsubscribe();
      this.leitura?.unsubscribe();
      this.temNovidades = false;
      this.monitorar();
    }
  }

  ngOnDestroy(): void {
    this.monitoramento?.unsubscribe();
    this.consulta?.unsubscribe();
    this.leitura?.unsubscribe();
  }

  private monitorar(): void {
    this.monitoramento?.unsubscribe();
    if (!this.auth.podeAcessar('historico-alteracoes')) return;
    this.monitoramento = merge(of(undefined), this.service.leituraAlterada).pipe(
      switchMap(() => {
        const consultas = this.diario
          ? [this.service.consultarLeitura('PRESENCAS', { ...this.filtros, dataAula: this.dataAula }),
             this.service.consultarLeitura('OCORRENCIAS', { ...this.filtros, dataAula: '' })]
          : [this.service.consultarLeitura(this.tipo, this.filtros)];
        return forkJoin(consultas).pipe(
          map(estados => ({ temNovidades: estados.some(estado => estado.temNovidades) })),
          catchError(() => of(null)));
      })
    ).subscribe({
      next: estado => {
        if (!estado) return;
        this.temNovidades = estado.temNovidades;
        this.cdr.markForCheck();
      }
    });
  }

  abrir(): void {
    this.aberto = true;
    this.carregando = true;
    this.erro = false;
    this.erroLeitura = false;
    this.atividadeSelecionada = null;
    this.atividadesNovas.clear();
    this.consulta?.unsubscribe();
    this.leitura?.unsubscribe();
    const tipo = this.tipoConsulta;
    const filtros = this.filtros;
    this.consulta = forkJoin({
      leitura: this.service.consultarLeitura(tipo, filtros).pipe(catchError(() => of(null))),
      atividades: this.service.atividades(tipo, 0, 5, '', filtros)
    }).subscribe({
      next: ({ leitura, atividades: resposta }) => {
        this.atividades = resposta.content;
        this.erroLeitura = leitura === null;
        this.atividadesNovas = new Set(this.atividades
          .filter(atividade => leitura && atividade.registros.some(evento => evento.id > leitura.ultimoLido))
          .map(atividade => atividade.evento.id));
        this.carregando = false;
        const ids = this.atividades.flatMap(atividade => atividade.registros.map(evento => evento.id));
        if (ids.length && leitura) {
          this.leitura?.unsubscribe();
          this.leitura = this.service.marcarLido(tipo, filtros, Math.max(...ids)).subscribe({
            next: () => {
              if (!this.diario) this.temNovidades = false;
              this.service.leituraAlterada.next();
              this.cdr.markForCheck();
            },
            error: () => {
              this.erroLeitura = true;
              this.cdr.markForCheck();
            }
          });
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = true;
        this.carregando = false;
        this.cdr.markForCheck();
      }
    });
  }

  fechar(): void {
    this.aberto = false;
    this.atividadeSelecionada = null;
    this.consulta?.unsubscribe();
  }

  selecionarAba(tipo: TipoRegistroHistorico): void {
    if (this.abaDiario === tipo) return;
    this.leitura?.unsubscribe();
    this.abaDiario = tipo;
    this.abrir();
  }
}
