import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionSelectionChange, MatPseudoCheckboxModule, MatPseudoCheckboxState } from '@angular/material/core';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { DiarioService, FormatoRelatorio } from 'src/app/shared/services/diario/diario.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { Turma } from 'src/app/shared/models/turma.model';
import { obterNomeDownload } from 'src/app/shared/utils/arquivo-acesso';

export type TipoRelatorio = 'PRESENCAS' | 'RESUMO';

// Mesmo limite validado pela API; o front só antecipa a mensagem.
export const LIMITE_DIAS_RELATORIO = 366;

const DIA_MS = 24 * 60 * 60 * 1000;

export function periodoValido(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('dataInicio')?.value;
  const fim = grupo.get('dataFim')?.value;
  if (!inicio || !fim) return null;
  if (fim < inicio) return { fimAntesDoInicio: true };
  const dias = Math.round((Date.parse(`${fim}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / DIA_MS) + 1;
  return dias > LIMITE_DIAS_RELATORIO ? { periodoLongo: true } : null;
}

export function mesDaData(data: string): { dataInicio: string; dataFim: string } {
  const [ano, mes] = data.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
  return { dataInicio: `${prefixo}-01`, dataFim: `${prefixo}-${String(ultimoDia).padStart(2, '0')}` };
}

@Component({
  selector: 'app-exportar-relatorio',
  standalone: true,
  imports: [ReactiveFormsModule, ModalLayout, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatPseudoCheckboxModule, OverlayModule],
  templateUrl: './exportar-relatorio.html',
  styleUrl: './exportar-relatorio.css'
})
export class ExportarRelatorio implements OnInit, OnDestroy {
  readonly unidades = input.required<{ id: number; nome: string }[]>();
  readonly idUnidade = input<number | null>(null);
  readonly idTurma = input<number | null>(null);
  readonly data = input.required<string>();
  readonly closed = output<void>();

  private fb = inject(FormBuilder);
  private diarioService = inject(DiarioService);
  private turmaService = inject(TurmaService);
  private toastr = inject(ToastrService);
  private subs = new Subscription();
  private geracao?: Subscription;

  readonly ajudaAberta = signal(false);
  readonly posicoesAjuda: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];

  teclaAjuda(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') { this.ajudaAberta.set(false); evento.stopPropagation(); }
  }

  readonly tipo = signal<TipoRelatorio>('PRESENCAS');
  readonly gerando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly tentouEnviar = signal(false);
  readonly carregandoTurmas = signal(true);
  private readonly todasTurmas = signal<Turma[]>([]);
  private readonly unidadePresencas = signal<number | null>(null);

  readonly turmasDaUnidade = computed(() =>
    this.todasTurmas().filter(t => t.unidade.id === this.unidadePresencas()));

  readonly turmasPorUnidade = computed(() => this.unidades()
    .map(unidade => ({ unidade, turmas: this.todasTurmas().filter(t => t.unidade.id === unidade.id) }))
    .filter(grupo => grupo.turmas.length > 0));

  formPresencas = this.fb.group({
    idUnidade: [null as number | null, Validators.required],
    idTurma: [null as number | null, Validators.required],
    dataInicio: ['', Validators.required],
    dataFim: ['', Validators.required],
    formato: ['PDF' as FormatoRelatorio, Validators.required],
    incluirOcorrencias: [true]
  }, { validators: periodoValido });

  formResumo = this.fb.group({
    idsTurmas: [[] as number[], Validators.required],
    dataInicio: ['', Validators.required],
    dataFim: ['', Validators.required],
    formato: ['PDF' as FormatoRelatorio, Validators.required]
  }, { validators: periodoValido });

  // Os itens-pai existem apenas no seletor; o formulário enviado mantém somente IDs reais de turmas.
  readonly selecaoTurmas = this.fb.nonNullable.control<number[]>([], Validators.required);

  ngOnInit(): void {
    const periodo = mesDaData(this.data());
    this.formPresencas.patchValue({ idUnidade: this.idUnidade(), idTurma: this.idTurma(), ...periodo });
    this.formResumo.patchValue({ idsTurmas: this.idTurma() ? [this.idTurma()!] : [], ...periodo });
    this.unidadePresencas.set(this.idUnidade());

    this.subs.add(this.formPresencas.controls.idUnidade.valueChanges.subscribe(id => {
      this.unidadePresencas.set(id);
      this.formPresencas.controls.idTurma.setValue(null);
    }));
    this.subs.add(this.formPresencas.valueChanges.subscribe(() => this.erro.set(null)));
    this.subs.add(this.formResumo.valueChanges.subscribe(() => this.erro.set(null)));
    this.subs.add(this.formResumo.controls.idsTurmas.valueChanges.subscribe(() => this.sincronizarSelecaoTurmas()));

    const permitidas = new Set(this.unidades().map(u => u.id));
    this.subs.add(this.turmaService.listar().subscribe({
      next: turmas => {
        this.todasTurmas.set(turmas.filter(t => permitidas.has(t.unidade.id)));
        this.sincronizarSelecaoTurmas();
        this.carregandoTurmas.set(false);
      },
      error: () => {
        this.carregandoTurmas.set(false);
        this.erro.set('Não foi possível carregar as turmas. Feche e abra o formulário novamente.');
      }
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.geracao?.unsubscribe();
  }

  get formAtual(): FormGroup {
    return this.tipo() === 'PRESENCAS' ? this.formPresencas : this.formResumo;
  }

  private turmasParaSelecao(unidade?: number): Turma[] {
    return this.turmasPorUnidade().filter(grupo => unidade === undefined || grupo.unidade.id === unidade)
      .flatMap(grupo => grupo.turmas);
  }

  estadoSelecaoTurmas(unidade?: number): MatPseudoCheckboxState {
    const selecionadas = new Set(this.formResumo.controls.idsTurmas.value ?? []);
    const turmas = this.turmasParaSelecao(unidade);
    const quantidade = turmas.filter(turma => selecionadas.has(turma.id)).length;
    if (quantidade === 0) return 'unchecked';
    return quantidade === turmas.length ? 'checked' : 'indeterminate';
  }

  descricaoEstadoSelecao(unidade?: number): string {
    const estado = this.estadoSelecaoTurmas(unidade);
    return estado === 'checked' ? 'todas selecionadas' : estado === 'indeterminate' ? 'seleção parcial' : 'nenhuma selecionada';
  }

  private sincronizarSelecaoTurmas(): void {
    const ids = new Set(this.formResumo.controls.idsTurmas.value ?? []);
    const valores: number[] = this.estadoSelecaoTurmas() === 'checked' ? [0] : [];
    for (const grupo of this.turmasPorUnidade()) {
      if (this.estadoSelecaoTurmas(grupo.unidade.id) === 'checked') valores.push(-grupo.unidade.id);
      valores.push(...grupo.turmas.filter(turma => ids.has(turma.id)).map(turma => turma.id));
    }
    this.selecaoTurmas.setValue(valores, { emitEvent: false });
  }

  alterarSelecaoTurmas(evento: MatOptionSelectionChange): void {
    if (!evento.isUserInput) return;
    const chave = evento.source.value as number;
    const disponiveis = this.turmasParaSelecao();
    const alvo = chave === 0 ? disponiveis : chave < 0
      ? this.turmasParaSelecao(-chave) : disponiveis.filter(turma => turma.id === chave);
    const controle = this.formResumo.controls.idsTurmas;
    const ids = new Set(controle.value ?? []);
    for (const turma of alvo) {
      if (evento.source.selected) ids.add(turma.id); else ids.delete(turma.id);
    }
    controle.setValue(disponiveis.filter(turma => ids.has(turma.id)).map(turma => turma.id));
    controle.markAsDirty(); controle.markAsTouched();
  }

  get rotuloTurmasSelecionadas(): string {
    const selecionadas = new Set(this.formResumo.controls.idsTurmas.value ?? []);
    return this.turmasPorUnidade().flatMap(grupo => {
      const turmas = grupo.turmas.filter(turma => selecionadas.has(turma.id));
      const periodos = (['MANHA', 'TARDE'] as const)
        .filter(periodo => turmas.some(turma => turma.periodo === periodo))
        .map(periodo => periodo === 'MANHA' ? 'Manhã' : 'Tarde');
      return periodos.length ? [`${grupo.unidade.nome} - ${periodos.join(' e ')}`] : [];
    }).join(', ');
  }

  selecionarTipo(tipo: TipoRelatorio): void {
    if (this.gerando()) return;
    this.tipo.set(tipo);
    this.tentouEnviar.set(false);
    this.erro.set(null);
  }

  rotuloTurma(turma: Turma): string {
    const hora = (valor: string) => String(valor).slice(0, 5);
    return `${turma.periodo === 'MANHA' ? 'Manhã' : 'Tarde'} (${hora(turma.horaInicio)} - ${hora(turma.horaFim)})`;
  }

  erroCampo(campo: string): string | null {
    const controle = this.formAtual.get(campo);
    if (!controle || !(controle.touched || this.tentouEnviar()) || !controle.errors?.['required']) return null;
    return {
      idUnidade: 'Selecione a unidade.',
      idTurma: 'Selecione a turma.',
      idsTurmas: 'Selecione ao menos uma turma.',
      dataInicio: 'Informe a data inicial.',
      dataFim: 'Informe a data final.'
    }[campo] ?? 'Campo obrigatório.';
  }

  get erroPeriodo(): string | null {
    const erros = this.formAtual.errors;
    if (erros?.['fimAntesDoInicio']) return 'A data final não pode ser anterior à data inicial.';
    if (erros?.['periodoLongo']) return `O período máximo é de ${LIMITE_DIAS_RELATORIO} dias.`;
    return null;
  }

  cancelar(): void {
    this.geracao?.unsubscribe();
    this.closed.emit();
  }

  gerar(): void {
    if (this.gerando()) return;
    this.tentouEnviar.set(true);
    this.formAtual.markAllAsTouched();
    if (this.tipo() === 'RESUMO') this.selecaoTurmas.markAsTouched();
    if (this.formAtual.invalid) return;

    let requisicao: Observable<HttpResponse<Blob>>;
    if (this.tipo() === 'PRESENCAS') {
      const valor = this.formPresencas.getRawValue();
      requisicao = this.diarioService.exportarPresencas({
        idTurma: valor.idTurma!, dataInicio: valor.dataInicio!, dataFim: valor.dataFim!,
        formato: valor.formato!, incluirOcorrencias: !!valor.incluirOcorrencias
      });
    } else {
      const valor = this.formResumo.getRawValue();
      requisicao = this.diarioService.exportarResumo({
        idsTurmas: valor.idsTurmas!, dataInicio: valor.dataInicio!, dataFim: valor.dataFim!, formato: valor.formato!
      });
    }

    this.gerando.set(true);
    this.erro.set(null);
    this.geracao = requisicao.subscribe({
      next: resposta => {
        this.gerando.set(false);
        if (!resposta.body?.size) {
          this.erro.set('O arquivo gerado veio vazio. Tente novamente.');
          return;
        }
        this.baixar(resposta);
        this.toastr.success('Relatório gerado com sucesso.');
      },
      error: async (erro: unknown) => {
        this.erro.set(await this.mensagemErro(erro));
        this.gerando.set(false);
      }
    });
  }

  private baixar(resposta: HttpResponse<Blob>): void {
    const blob = resposta.body!;
    const nomePadrao = this.tipo() === 'PRESENCAS' ? 'presencas-detalhadas' : 'resumo-frequencia';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = obterNomeDownload(resposta.headers.get('Content-Disposition'), nomePadrao, '', blob.type);
    link.hidden = true;
    link.addEventListener('click', evento => evento.stopPropagation());
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  private async mensagemErro(erro: unknown): Promise<string> {
    if (erro instanceof HttpErrorResponse) {
      if (erro.status === 0) return 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.';
      try {
        // Com responseType blob, o corpo JSON do erro chega como Blob.
        const corpo = erro.error instanceof Blob ? JSON.parse(await erro.error.text()) : erro.error;
        if (corpo?.message) return corpo.message;
      } catch {
        // Usa a mensagem padrão abaixo quando o corpo não é JSON.
      }
      if (erro.status === 403) return 'Você não possui permissão para exportar relatórios desta turma.';
    }
    return 'Não foi possível gerar o relatório. Tente novamente.';
  }
}
