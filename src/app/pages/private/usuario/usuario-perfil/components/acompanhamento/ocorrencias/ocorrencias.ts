import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { ModalLayout } from 'src/app/components/modal-layout/modal-layout';
import { BarraBusca } from 'src/app/components/barra-busca/barra-busca';
import { Paginacao } from 'src/app/components/paginacao/paginacao';
import { TabelaLayout, TabelaColuna, TabelaAcao } from 'src/app/components/tabela-layout/tabela-layout';
import { MatriculaHistoricoDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { AcompanhamentoService, OcorrenciaAcompanhamento } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { DiarioService, OcorrenciaResponseDTO } from 'src/app/shared/services/diario/diario.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { inicioPeriodoDiario } from 'src/app/shared/utils/periodo-diario';
import { ListaPaginada } from '../compartilhado/lista-paginada';
import { AjudaAcompanhamento } from '../compartilhado/ajuda-acompanhamento';
import { dataNaoFutura, horarioNaoFuturo, hojeBrasilia } from '../compartilhado/validacoes-data-hora';

@Component({
  selector: 'app-acompanhamento-ocorrencias', standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatIconModule, ModalLayout, BarraBusca, Paginacao, TabelaLayout, AjudaAcompanhamento],
  templateUrl: './ocorrencias.html', styleUrl: '../compartilhado/acompanhamento.css',
})
export class AcompanhamentoOcorrencias implements OnChanges, OnDestroy {
  @Input({ required: true }) usuario!: UsuarioResponseDTO;
  private readonly service = inject(AcompanhamentoService);
  private readonly diario = inject(DiarioService);
  private readonly sessao = inject(SessaoService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  private operacao?: Subscription;
  private consultaMatriculas?: Subscription;
  readonly matriculas = signal<MatriculaHistoricoDTO[]>([]);
  readonly carregandoMatriculas = signal(false);
  readonly erroMatriculas = signal('');
  readonly lista = new ListaPaginada<OcorrenciaAcompanhamento>((p, t, b) => this.service.ocorrencias(this.usuario.id, p, t, b));
  readonly modal = signal<'NOVO' | 'EDITAR' | 'VER' | null>(null);
  readonly selecionada = signal<OcorrenciaAcompanhamento | null>(null);
  readonly salvando = signal(false);
  readonly erro = signal('');
  readonly tipos = [
    { valor: 'COMPORTAMENTO', nome: 'Comportamento' }, { valor: 'SAUDE', nome: 'Saúde' },
    { valor: 'ASSISTENCIA', nome: 'Assistência' }, { valor: 'OUTRO', nome: 'Outro' },
  ];
  readonly form = this.fb.nonNullable.group({
    matricula: [0, [Validators.required, Validators.min(1), (c: AbstractControl) => this.validarMatricula(c)]],
    data: ['', [Validators.required, (c: AbstractControl) => this.validarData(c)]],
    horario: ['', [Validators.required, horarioNaoFuturo]],
    tipoOcorrencia: ['', Validators.required], descricao: ['', [Validators.required, Validators.pattern(/\S/)]],
  });
  private inicial = '';
  private readonly validacao = new Subscription();

  constructor() {
    this.validacao.add(this.form.controls.data.valueChanges.subscribe(() =>
      this.form.controls.horario.updateValueAndValidity({ emitEvent: false })));
    this.validacao.add(this.form.controls.matricula.valueChanges.subscribe(() => {
      this.form.controls.data.updateValueAndValidity({ emitEvent: false });
      this.form.controls.horario.updateValueAndValidity({ emitEvent: false });
    }));
  }
  readonly colunas: TabelaColuna<OcorrenciaAcompanhamento>[] = [
    { chave: 'dataOcorrencia', titulo: 'Data da ocorrência', principalMobile: true, formatar: v => this.formatarData(v) },
    { chave: 'tipoOcorrencia', titulo: 'Tipo', formatar: v => this.nomeTipo(v) },
    { chave: 'descricao', titulo: 'Descrição' },
  ];
  readonly acoes: TabelaAcao<OcorrenciaAcompanhamento>[] = [
    { acao: 'visualizar', icone: 'visibility', tooltip: 'Visualizar', executar: o => this.abrir('VER', o) },
    { acao: 'editar', icone: 'edit', tooltip: 'Editar', visivel: o => this.podeAlterar(o), executar: o => this.abrir('EDITAR', o) },
    { acao: 'excluir', icone: 'delete', tooltip: 'Excluir', visivel: o => this.podeAlterar(o), executar: o => void this.excluir(o) },
  ];

  ngOnChanges(): void { this.cancelar(); this.matriculas.set([]); this.lista.reiniciar(); }
  ngOnDestroy(): void { this.lista.destruir(); this.operacao?.unsubscribe(); this.consultaMatriculas?.unsubscribe(); this.validacao.unsubscribe(); }
  get temAlteracoes(): boolean {
    return (this.modal() === 'NOVO' || this.modal() === 'EDITAR') && JSON.stringify(this.form.getRawValue()) !== this.inicial;
  }
  get hoje(): string { return hojeBrasilia(); }

  private validarMatricula(control: AbstractControl): ValidationErrors | null {
    if (this.modal() !== 'NOVO' || !control.value || this.carregandoMatriculas()) return null;
    return this.matriculas().some(m => m.id === control.value) ? null : { regra: 'Selecione uma matrícula válida.' };
  }

  private validarData(control: AbstractControl): ValidationErrors | null {
    const erro = dataNaoFutura(control);
    if (erro || !control.value || this.modal() !== 'NOVO') return erro;
    if (this.sessao.isMonitor() && control.value < inicioPeriodoDiario(this.hoje)) {
      return { regra: 'Monitores podem registrar ocorrências desde o primeiro dia do mês anterior.' };
    }
    const matricula = this.matriculas().find(m => m.id === control.parent?.get('matricula')?.value);
    if (matricula && (control.value < matricula.dataIngresso.slice(0, 10)
        || (matricula.dataDesligamento && control.value > matricula.dataDesligamento.slice(0, 10)))) {
      return { regra: 'A matrícula selecionada não estava ativa na data informada.' };
    }
    return null;
  }
  get dataMinima(): string | null {
    const ingresso = this.matriculas().find(m => m.id === this.form.controls.matricula.value)?.dataIngresso.slice(0, 10);
    const periodo = this.sessao.isMonitor() && this.modal() === 'NOVO' ? inicioPeriodoDiario(this.hoje) : '';
    return [ingresso ?? '', periodo].sort().at(-1) || null;
  }
  get dataMaxima(): string {
    const fim = this.matriculas().find(m => m.id === this.form.controls.matricula.value)?.dataDesligamento?.slice(0, 10);
    return fim && fim < this.hoje ? fim : this.hoje;
  }
  podeAlterar(ocorrencia: OcorrenciaResponseDTO): boolean {
    if (this.sessao.isAdministrador() || this.sessao.isCoordenador()) return true;
    // dataCriacao é um horário local de Brasília, como no Diário.
    const decorrido = Date.now() - new Date(ocorrencia.dataCriacao + '-03:00').getTime();
    return this.sessao.isMonitor() && ocorrencia.idMembro === this.sessao.membro()?.id
      && decorrido >= 0 && decorrido <= 24 * 60 * 60 * 1000;
  }

  abrir(modo: 'NOVO' | 'EDITAR' | 'VER', ocorrencia: OcorrenciaAcompanhamento | null = null): void {
    if (this.salvando() || (modo === 'EDITAR' && (!ocorrencia || !this.podeAlterar(ocorrencia)))) return;
    this.consultaMatriculas?.unsubscribe();
    this.modal.set(modo);
    this.selecionada.set(ocorrencia); this.form.enable();
    this.form.reset({ matricula: ocorrencia?.idMatricula ?? 0, data: ocorrencia?.dataOcorrencia.slice(0, 10) ?? '',
      horario: ocorrencia?.dataOcorrencia.slice(11, 16) ?? '',
      tipoOcorrencia: ocorrencia?.tipoOcorrencia ?? '', descricao: ocorrencia?.descricao ?? '' });
    if (modo !== 'NOVO') this.bloquearVinculoEData();
    this.inicial = JSON.stringify(this.form.getRawValue());
    this.erro.set('');
    if (modo === 'NOVO') this.carregarMatriculas();
  }

  carregarMatriculas(): void {
    if (this.modal() !== 'NOVO' || this.salvando()) return;
    this.consultaMatriculas?.unsubscribe();
    this.carregandoMatriculas.set(true); this.erroMatriculas.set(''); this.matriculas.set([]);
    this.consultaMatriculas = this.service.matriculasFrequencia(this.usuario.id).subscribe({
      next: matriculas => {
        this.matriculas.set(matriculas); this.carregandoMatriculas.set(false);
        if (matriculas.length === 1 && !this.form.controls.matricula.value) {
          this.form.controls.matricula.setValue(matriculas[0].id);
          this.inicial = JSON.stringify({ ...JSON.parse(this.inicial), matricula: matriculas[0].id });
        }
        this.form.controls.matricula.updateValueAndValidity({ emitEvent: false });
        this.form.controls.data.updateValueAndValidity({ emitEvent: false });
      },
      error: () => {
        this.carregandoMatriculas.set(false);
        this.erroMatriculas.set('Não foi possível carregar as matrículas. Tente novamente.');
      },
    });
  }

  nomeMatricula(matricula: MatriculaHistoricoDTO): string {
    const data = (valor: string) => valor.slice(0, 10).split('-').reverse().join('/');
    return `${matricula.nomeUnidade} - ${matricula.periodoTurma === 'MANHA' ? 'Manhã' : 'Tarde'} `
      + `(${data(matricula.dataIngresso)} a ${matricula.dataDesligamento ? data(matricula.dataDesligamento) : 'hoje'})`;
  }

  private bloquearVinculoEData(): void {
    this.form.controls.data.disable(); this.form.controls.matricula.disable();
  }

  async fechar(): Promise<void> {
    if (this.salvando()) return;
    if (this.temAlteracoes && !await Alertas.confirmarDescarte()) return;
    this.cancelar();
  }
  cancelar(): void {
    if (!this.salvando()) {
      this.consultaMatriculas?.unsubscribe(); this.carregandoMatriculas.set(false);
      this.modal.set(null); this.erro.set('');
    }
  }

  salvar(): void {
    const ocorrencia = this.selecionada();
    const modo = this.modal();
    if (this.salvando() || (modo !== 'NOVO' && modo !== 'EDITAR')) return;
    if (modo === 'EDITAR' && (!ocorrencia || !this.podeAlterar(ocorrencia))) {
      this.erro.set('Você não tem permissão ou o prazo para alterar esta ocorrência foi encerrado.'); return;
    }
    if (modo === 'NOVO' && (this.carregandoMatriculas() || this.erroMatriculas())) return;
    this.form.controls.matricula.updateValueAndValidity({ emitEvent: false });
    this.form.controls.data.updateValueAndValidity({ emitEvent: false });
    this.form.controls.horario.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched(); if (this.form.invalid) return;
    const dados = this.form.getRawValue();
    this.salvando.set(true); this.form.disable(); this.erro.set('');
    const payload = {
      dataOcorrencia: `${dados.data}T${dados.horario}:00`, tipoOcorrencia: dados.tipoOcorrencia,
      descricao: dados.descricao.trim(),
    };
    const requisicao = modo === 'NOVO'
      ? this.diario.criarOcorrencia({ ...payload, idMatricula: dados.matricula })
      : this.diario.atualizarOcorrencia(ocorrencia!.id, payload);
    this.operacao = requisicao.subscribe({
      next: () => {
        this.salvando.set(false); this.cancelar();
        this.toastr.success(modo === 'NOVO' ? 'Ocorrência registrada.' : 'Ocorrência atualizada.'); this.lista.carregar();
      },
      error: (e: { error?: { message?: string } }) => {
        this.salvando.set(false); this.form.enable();
        if (modo === 'EDITAR') this.bloquearVinculoEData();
        this.erro.set(e.error?.message ?? 'Não foi possível salvar a ocorrência. Tente novamente.');
      },
    });
  }

  async excluir(ocorrencia: OcorrenciaAcompanhamento): Promise<void> {
    if (this.salvando() || !this.podeAlterar(ocorrencia) || !await Alertas.confirmarExclusao('Deseja excluir esta ocorrência?')) return;
    if (this.salvando() || !this.podeAlterar(ocorrencia)) return;
    this.salvando.set(true);
    this.operacao = this.diario.deletarOcorrencia(ocorrencia.id).subscribe({
      next: () => { this.salvando.set(false); this.toastr.success('Ocorrência excluída.'); this.lista.carregar(); },
      error: () => { this.salvando.set(false); this.toastr.error('Não foi possível excluir a ocorrência.'); },
    });
  }

  abrirCalendario(input: HTMLInputElement): void { if (!input.disabled) input.showPicker?.(); }
  abrirSeletorHora(input: HTMLInputElement): void {
    if (input.disabled) return;
    try {
      if (typeof input.showPicker === 'function') { input.showPicker(); return; }
    } catch {
      // Mantém o campo acessível quando o navegador não permite abrir o seletor.
    }
    input.focus(); input.click();
  }
  nomeTipo(tipo: string): string { return this.tipos.find(t => t.valor === tipo)?.nome ?? tipo; }
  formatarData(valor: string): string {
    const [data, hora] = valor.split('T'); return `${data.split('-').reverse().join('/')} às ${hora?.slice(0, 5).replace(':', 'h') ?? ''}`;
  }
}
