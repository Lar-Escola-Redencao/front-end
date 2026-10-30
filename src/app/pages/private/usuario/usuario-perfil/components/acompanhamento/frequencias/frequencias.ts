import { Component, Input, OnChanges, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { MatriculaHistoricoDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { AcompanhamentoService, ResumoFrequencia } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { PERIODOS_FREQUENCIA, PeriodoFrequencia, completarMeses, hojeBrasilia, intervaloPeriodo, validarIntervalo } from './periodos-frequencia';
import { AjudaAcompanhamento } from '../compartilhado/ajuda-acompanhamento';

@Component({
  selector: 'app-acompanhamento-frequencias', standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, AjudaAcompanhamento],
  templateUrl: './frequencias.html', styleUrl: './frequencias.css',
})
export class AcompanhamentoFrequencias implements OnChanges, OnDestroy {
  @Input({ required: true }) usuario!: UsuarioResponseDTO;
  private readonly service = inject(AcompanhamentoService);
  private readonly fb = inject(FormBuilder);
  private consulta?: Subscription;
  private consultaMatriculas?: Subscription;
  readonly periodos = PERIODOS_FREQUENCIA;
  readonly form = this.fb.group({
    periodo: this.fb.nonNullable.control<PeriodoFrequencia>('ESTE_ANO'),
    matricula: this.fb.nonNullable.control(0),
    dataInicio: this.fb.nonNullable.control(''), dataFim: this.fb.nonNullable.control(''),
  });
  readonly matriculas = signal<MatriculaHistoricoDTO[]>([]);
  readonly carregandoMatriculas = signal(false);
  readonly erroMatriculas = signal<string | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroPeriodo = signal<string | null>(null);
  readonly resumo = signal<ResumoFrequencia | null>(null);
  readonly meses = computed(() => {
    const dados = this.resumo();
    return dados ? completarMeses(dados.dataInicio, dados.dataFim, dados.meses) : [];
  });
  readonly larguraGrafico = computed(() => Math.max(500, this.meses().length * 64 + 70));
  readonly escalaMaxima = computed(() => {
    const maior = this.meses().reduce((valor, m) => Math.max(valor, m.presencas, m.faltas), 0);
    return Math.max(4, Math.ceil(maior / 4) * 4);
  });
  readonly linhasGrade = computed(() => Array.from({ length: 5 }, (_, i) => ({
    valor: this.escalaMaxima() * i / 4, y: 205 - i * 45,
  })));
  readonly percentualPresencas = computed(() => {
    const dados = this.resumo();
    return dados?.totalRegistros ? Math.round(dados.presencas * 1000 / dados.totalRegistros) / 10 : 0;
  });

  ngOnChanges(): void {
    if (!this.usuario?.id) return;
    this.consulta?.unsubscribe(); this.consultaMatriculas?.unsubscribe();
    this.form.reset({ periodo: 'ESTE_ANO', matricula: 0, ...intervaloPeriodo('ESTE_ANO', hojeBrasilia()) });
    this.matriculas.set([]); this.carregarMatriculas(); this.aplicar();
  }

  carregarMatriculas(): void {
    this.consultaMatriculas?.unsubscribe();
    this.form.controls.matricula.disable({ emitEvent: false });
    this.carregandoMatriculas.set(true); this.erroMatriculas.set(null);
    this.consultaMatriculas = this.service.matriculasFrequencia(this.usuario.id).subscribe({
      next: matriculas => {
        this.matriculas.set(matriculas); this.carregandoMatriculas.set(false);
        this.form.controls.matricula.enable({ emitEvent: false });
      },
      error: () => {
        this.erroMatriculas.set('Não foi possível carregar as matrículas.'); this.carregandoMatriculas.set(false);
      },
    });
  }

  alterarPeriodo(): void {
    this.erroPeriodo.set(null);
    const periodo = this.form.controls.periodo.value;
    if (periodo === 'PERSONALIZADO') return;
    this.form.patchValue(intervaloPeriodo(periodo, hojeBrasilia())); this.aplicar();
  }

  aplicar(): void {
    const filtros = this.form.getRawValue();
    const erro = validarIntervalo(filtros.dataInicio, filtros.dataFim);
    this.erroPeriodo.set(erro);
    if (erro) return;
    this.consulta?.unsubscribe();
    this.carregando.set(true); this.erro.set(null); this.resumo.set(null);
    this.consulta = this.service.frequencias(this.usuario.id, {
      inicio: filtros.dataInicio, fim: filtros.dataFim, matricula: filtros.matricula || null,
    }).subscribe({
      next: dados => { this.resumo.set(dados); this.carregando.set(false); },
      error: () => {
        this.erro.set('Não foi possível carregar a frequência. Tente novamente.'); this.carregando.set(false);
      },
    });
  }

  dataLegivel(data: string): string { return data.slice(0, 10).split('-').reverse().join('/'); }
  rotuloMatricula(m: MatriculaHistoricoDTO): string {
    return `${m.nomeUnidade} - ${m.periodoTurma === 'MANHA' ? 'Manhã' : 'Tarde'} (${this.dataLegivel(m.dataIngresso)} a ${m.dataDesligamento ? this.dataLegivel(m.dataDesligamento) : 'hoje'})`;
  }
  rotuloMes(ano: number, mes: number): string {
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${meses[mes - 1]}/${ano}`;
  }
  alturaBarra(valor: number): number { return valor / this.escalaMaxima() * 180; }
  percentual(valor: number): string {
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(valor)}%`;
  }
  ngOnDestroy(): void { this.consulta?.unsubscribe(); this.consultaMatriculas?.unsubscribe(); }
}
