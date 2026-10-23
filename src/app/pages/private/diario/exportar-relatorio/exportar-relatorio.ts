import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
  imports: [ReactiveFormsModule, ModalLayout, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
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

  @ViewChild('ajudaTipos') private ajudaTipos?: ElementRef<HTMLDetailsElement>;

  // Captura: o modal-card interrompe a propagação do clique, então um listener comum não o veria.
  private readonly fecharAjudaAoClicarFora = (event: MouseEvent): void => {
    const painel = this.ajudaTipos?.nativeElement;
    if (painel?.open && !painel.contains(event.target as Node)) {
      painel.open = false;
    }
  };

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

  ngOnInit(): void {
    document.addEventListener('click', this.fecharAjudaAoClicarFora, true);
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

    const permitidas = new Set(this.unidades().map(u => u.id));
    this.subs.add(this.turmaService.listar().subscribe({
      next: turmas => {
        this.todasTurmas.set(turmas.filter(t => permitidas.has(t.unidade.id)));
        this.carregandoTurmas.set(false);
      },
      error: () => {
        this.carregandoTurmas.set(false);
        this.erro.set('Não foi possível carregar as turmas. Feche e abra o formulário novamente.');
      }
    }));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.fecharAjudaAoClicarFora, true);
    this.subs.unsubscribe();
    this.geracao?.unsubscribe();
  }

  get formAtual(): FormGroup {
    return this.tipo() === 'PRESENCAS' ? this.formPresencas : this.formResumo;
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
        this.closed.emit();
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
