import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ToastrService } from 'ngx-toastr';

import { ModalLayout } from '@components/modal-layout/modal-layout';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { AtualizarUnidadeDTO, CriarUnidadeDTO, Unidade } from 'src/app/shared/models/unidade.model';
import {
  AtualizarTurmaDTO,
  CriarTurmaDTO,
  Periodo,
  Turma,
} from 'src/app/shared/models/turma.model';
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario, validarImagem } from 'src/app/shared/utils/form-validations';
import { formatarTelefone } from 'src/app/shared/utils/masks';
import { environment } from 'src/environments/environment';

type DiaSemana = { valor: string; label: string };
type OpcaoPeriodo = { valor: Periodo; label: string };

@Component({
  selector: 'app-unidades-turmas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './unidades-turmas.html',
  styleUrl: './unidades-turmas.css',
})
export class UnidadesTurmas implements OnInit, ComponentComAlteracoesNaoSalvas {
  abaAtiva: 'turmas' | 'unidades' = 'unidades';

  unidades: Unidade[] = [];

  modalAberto = false;
  modoEdicao = false;
  unidadeSelecionadaId: number | null = null;
  formUnidade: FormGroup;
  erros: { [key: string]: string } = {};
  isLoading = false;
  modalTremendo = false;
  valoresOriginaisDoFormulario: any = null;

  modalVisualizacaoAberto = false;
  unidadeVisualizacao: Unidade | null = null;

  imagemPreview: string | null = null;
  nomeArquivoSelecionado = '';
  imagemSelecionada: File | null = null;

  readonly corPadrao = '#F5F5F5';

  readonly diasSemana: DiaSemana[] = [
    { valor: 'SEG', label: 'Segunda' },
    { valor: 'TER', label: 'Terça' },
    { valor: 'QUA', label: 'Quarta' },
    { valor: 'QUI', label: 'Quinta' },
    { valor: 'SEX', label: 'Sexta' },
    { valor: 'SAB', label: 'Sábado' },
    { valor: 'DOM', label: 'Domingo' },
  ];

  private readonly diasUteis = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];

  private readonly mensagensCustomizadas: Record<string, Record<string, string>> = {
    telefone: {
      minlength: 'Telefone incompleto.',
      maxlength: 'Telefone incompleto.',
    },
    diasFuncionamento: {
      required: 'Selecione ao menos um dia de funcionamento.',
    },
    horarioFechamento: {
      horarioInvalido: 'O horário de fechamento deve ser depois da abertura.',
    },
    idadeMax: {
      idadeInvalida: 'A idade máxima não pode ser menor que a mínima.',
    },
  };

  // ---------------------------------------------------------------
  // TURMAS
  // ---------------------------------------------------------------

  turmas: Turma[] = [];
  unidadeFiltroId: number | null = null;

  modalTurmaAberto = false;
  modoEdicaoTurma = false;
  turmaSelecionadaId: number | null = null;
  formTurma: FormGroup;
  errosTurma: { [key: string]: string } = {};
  isLoadingTurma = false;
  modalTurmaTremendo = false;
  valoresOriginaisFormTurma: any = null;

  carregandoUnidades = false;
  erroCarregarUnidades = false;

  readonly periodos: OpcaoPeriodo[] = [
    { valor: 'MANHA', label: 'Manhã' },
    { valor: 'TARDE', label: 'Tarde' },
    { valor: 'NOITE', label: 'Noite' },
  ];

  private readonly mensagensCustomizadasTurma: Record<string, Record<string, string>> = {
    horaFim: {
      horarioInvalido: 'O horário de término deve ser depois do início.',
    },
    unidadeId: {
      required: 'Selecione uma unidade.',
    },
  };

  colunasTurmas: TabelaColuna<Turma>[] = [
    {
      chave: 'periodo',
      titulo: 'Período',
      principalMobile: true,
      formatar: (valor: Periodo) => this.formatarPeriodo(valor),
    },
    {
      chave: 'horaInicio',
      titulo: 'Horário',
      formatar: (_valor: string, linha: Turma) =>
        `${this.formatarHorario(linha.horaInicio)} às ${this.formatarHorario(linha.horaFim)}`,
    },
    {
      chave: 'unidade',
      titulo: 'Unidade',
      formatar: (valor: Turma['unidade']) => valor?.nome || '-',
    },
  ];

  acoesTabelaTurmas: TabelaAcao<Turma>[] = [
    {
      icone: 'edit',
      tooltip: 'Editar',
      acao: 'editar',
    },
    {
      icone: 'delete',
      tooltip: 'Excluir',
      acao: 'excluir',
    },
  ];

  colunas: TabelaColuna<Unidade>[] = [
    {
      chave: 'nome',
      titulo: 'Nome',
      principalMobile: true,
    },
    {
      chave: 'endereco',
      titulo: 'Endereço',
    },
    {
      chave: 'telefone',
      titulo: 'Telefone',
    },
    {
      chave: 'horarioAbertura',
      titulo: 'Horário',
      formatar: (_valor: string, linha: Unidade) =>
        `${this.formatarHorario(linha.horarioAbertura)} às ${this.formatarHorario(linha.horarioFechamento)}`,
    },
  ];

  acoesTabela: TabelaAcao<Unidade>[] = [
    {
      icone: 'visibility',
      tooltip: 'Visualizar',
      acao: 'visualizar',
    },
    {
      icone: 'edit',
      tooltip: 'Editar',
      acao: 'editar',
    },
    {
      icone: 'delete',
      tooltip: 'Excluir',
      acao: 'excluir',
    },
  ];

  constructor(
    private unidadeService: UnidadeService,
    private turmaService: TurmaService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private ngZone: NgZone,
  ) {
    this.formTurma = this.fb.group({
      periodo: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFim: ['', Validators.required],
      unidadeId: [null, Validators.required],
    });

    this.formUnidade = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(100)]],
      endereco: ['', [Validators.required, Validators.maxLength(255)]],
      telefone: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(15)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      diasFuncionamento: [[] as string[], Validators.required],
      horarioAbertura: ['', Validators.required],
      horarioFechamento: ['', Validators.required],
      idadeMin: ['', [Validators.required, Validators.min(0)]],
      idadeMax: ['', [Validators.required, Validators.min(0)]],
      corHex: [this.corPadrao],
      imagem: [null, [validarImagem()]],
    });
  }

  ngOnInit(): void {
    this.carregarUnidades();
    this.carregarTurmas();

    this.formUnidade.get('horarioAbertura')?.valueChanges.subscribe(() => this.checarHorarios());

    this.formUnidade.get('horarioFechamento')?.valueChanges.subscribe(() => this.checarHorarios());

    this.formUnidade.get('idadeMin')?.valueChanges.subscribe(() => this.checarFaixaEtaria());

    this.formUnidade.get('idadeMax')?.valueChanges.subscribe(() => this.checarFaixaEtaria());

    this.formTurma.get('horaInicio')?.valueChanges.subscribe(() => this.checarHorariosTurma());

    this.formTurma.get('horaFim')?.valueChanges.subscribe(() => this.checarHorariosTurma());
  }

  get mensagemVazia(): string {
    return 'Nenhuma unidade cadastrada ainda';
  }

  get mensagemVaziaTurmas(): string {
    return 'Nenhuma turma cadastrada ainda';
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao) {
      return this.formUnidade.dirty || this.imagemSelecionada !== null;
    }

    if (this.imagemSelecionada !== null) {
      return true;
    }

    const valorAtual = { ...this.formUnidade.getRawValue(), imagem: null };
    const valorOriginal = { ...this.valoresOriginaisDoFormulario, imagem: null };

    return JSON.stringify(valorAtual) !== JSON.stringify(valorOriginal);
  }

  get temAlteracoesTurma(): boolean {
    if (!this.modoEdicaoTurma) {
      return this.formTurma.dirty;
    }

    return (
      JSON.stringify(this.formTurma.getRawValue()) !==
      JSON.stringify(this.valoresOriginaisFormTurma)
    );
  }

  carregarUnidades(): void {
    this.carregandoUnidades = true;
    this.erroCarregarUnidades = false;

    this.unidadeService.listarTodas().subscribe({
      next: (dados: Unidade[]) => {
        this.ngZone.run(() => {
          this.unidades = [...dados];
          this.carregandoUnidades = false;
          this.atualizarDisponibilidadeUnidadeId();
          this.cdr.detectChanges();
        });
      },

      error: (err: any) => {
        console.error('Erro na API:', err);

        this.toastr.error('Não foi possível carregar a lista de unidades.', 'Erro');

        this.carregandoUnidades = false;
        this.erroCarregarUnidades = true;
        this.atualizarDisponibilidadeUnidadeId();
        this.cdr.detectChanges();
      },
    });
  }

  private atualizarDisponibilidadeUnidadeId(): void {
    const controle = this.formTurma.get('unidadeId');

    if (!controle) {
      return;
    }

    if (this.erroCarregarUnidades || this.unidades.length === 0) {
      controle.disable();
    } else {
      controle.enable();
    }
  }

  carregarTurmas(): void {
    this.turmaService.listar(this.unidadeFiltroId).subscribe({
      next: (dados: Turma[]) => {
        this.ngZone.run(() => {
          this.turmas = [...dados];
          this.cdr.detectChanges();
        });
      },

      error: (err: any) => {
        console.error('Erro na API:', err);

        this.toastr.error('Não foi possível carregar a lista de turmas.', 'Erro');

        this.cdr.detectChanges();
      },
    });
  }

  onFiltroUnidadeChange(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.unidadeFiltroId = valor ? Number(valor) : null;
    this.carregarTurmas();
  }

  formatarPeriodo(valor: Periodo): string {
    return this.periodos.find((p) => p.valor === valor)?.label || valor;
  }

  abrirCadastro(): void {
    this.modoEdicao = false;
    this.unidadeSelecionadaId = null;
    this.erros = {};
    this.isLoading = false;
    this.modalTremendo = false;
    this.valoresOriginaisDoFormulario = null;
    this.imagemPreview = null;
    this.nomeArquivoSelecionado = '';
    this.imagemSelecionada = null;

    this.formUnidade.reset({
      nome: '',
      endereco: '',
      telefone: '',
      email: '',
      diasFuncionamento: [],
      horarioAbertura: '',
      horarioFechamento: '',
      idadeMin: '',
      idadeMax: '',
      corHex: this.corPadrao,
      imagem: null,
    });

    this.formUnidade.markAsPristine();
    this.modalAberto = true;
  }

  abrirEdicao(unidade: Unidade): void {
    this.modoEdicao = true;
    this.unidadeSelecionadaId = unidade.id;
    this.erros = {};
    this.isLoading = false;
    this.modalTremendo = false;
    this.imagemPreview = this.tratarImagem(unidade.imagem);
    this.nomeArquivoSelecionado = '';
    this.imagemSelecionada = null;

    this.formUnidade.reset({
      nome: unidade.nome,
      endereco: unidade.endereco,
      telefone: formatarTelefone(unidade.telefone),
      email: unidade.email,
      diasFuncionamento: this.ordenarDias(this.separarDias(unidade.diasFuncionamento)),
      horarioAbertura: this.paraInputHorario(unidade.horarioAbertura),
      horarioFechamento: this.paraInputHorario(unidade.horarioFechamento),
      idadeMin: unidade.idadeMin,
      idadeMax: unidade.idadeMax,
      corHex: unidade.corHex || this.corPadrao,
      imagem: null,
    });

    this.formUnidade.markAsPristine();
    this.valoresOriginaisDoFormulario = this.formUnidade.getRawValue();
    this.modalAberto = true;
  }

  abrirCadastroTurma(): void {
    this.modoEdicaoTurma = false;
    this.turmaSelecionadaId = null;
    this.errosTurma = {};
    this.isLoadingTurma = false;
    this.modalTurmaTremendo = false;
    this.valoresOriginaisFormTurma = null;

    this.formTurma.reset({
      periodo: '',
      horaInicio: '',
      horaFim: '',
      unidadeId: null,
    });

    this.formTurma.markAsPristine();
    this.modalTurmaAberto = true;
  }

  abrirEdicaoTurma(turma: Turma): void {
    this.modoEdicaoTurma = true;
    this.turmaSelecionadaId = turma.id;
    this.errosTurma = {};
    this.isLoadingTurma = false;
    this.modalTurmaTremendo = false;

    this.formTurma.reset({
      periodo: turma.periodo,
      horaInicio: turma.horaInicio,
      horaFim: turma.horaFim,
      unidadeId: turma.unidade ? Number(turma.unidade.id) : null,
    });

    this.formTurma.markAsPristine();
    this.valoresOriginaisFormTurma = this.formTurma.getRawValue();
    this.modalTurmaAberto = true;
  }

  tratarImagem(caminho: string | null | undefined): string | null {
    if (!caminho) {
      return null;
    }

    if (
      caminho.startsWith('http://') ||
      caminho.startsWith('https://') ||
      caminho.startsWith('data:')
    ) {
      return caminho;
    }

    return `${environment.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }

  onImagemSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    const imagemControl = this.formUnidade.get('imagem');
    imagemControl?.setValue(arquivo);
    imagemControl?.markAsDirty();
    imagemControl?.markAsTouched();
    imagemControl?.updateValueAndValidity();
    this.verificarErros();

    if (imagemControl?.invalid) {
      this.imagemSelecionada = null;
      this.nomeArquivoSelecionado = '';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.imagemSelecionada = arquivo;
    this.nomeArquivoSelecionado = arquivo.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagemPreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(arquivo);
  }

  fecharModal(): void {
    if (!(this.modalAberto && this.temAlteracoes)) {
      this.fecharModalSemConfirmacao();
      return;
    }

    Alertas.confirmarDescarte().then((confirmado: boolean) => {
      this.ngZone.run(() => {
        if (confirmado) {
          this.fecharModalSemConfirmacao();
        } else {
          this.dispararTremorModal();
        }

        this.cdr.detectChanges();
      });
    });
  }

  fecharModalTurma(): void {
    if (!(this.modalTurmaAberto && this.temAlteracoesTurma)) {
      this.fecharModalTurmaSemConfirmacao();
      return;
    }

    Alertas.confirmarDescarte().then((confirmado: boolean) => {
      this.ngZone.run(() => {
        if (confirmado) {
          this.fecharModalTurmaSemConfirmacao();
        } else {
          this.dispararTremorModalTurma();
        }

        this.cdr.detectChanges();
      });
    });
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return (
      (this.modalAberto && this.temAlteracoes) || (this.modalTurmaAberto && this.temAlteracoesTurma)
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  verificarErros(): void {
    this.erros = mapearErrosFormulario(this.formUnidade, this.mensagensCustomizadas);
  }

  verificarErrosTurma(): void {
    this.errosTurma = mapearErrosFormulario(this.formTurma, this.mensagensCustomizadasTurma);
  }

  aplicarMascaraTelefone(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.formUnidade.get('telefone')?.setValue(formatarTelefone(input.value), { emitEvent: false });

    this.verificarErros();
  }

  diaSelecionado(dia: string): boolean {
    const atuais: string[] = this.formUnidade.get('diasFuncionamento')?.value || [];

    return atuais.includes(dia);
  }

  toggleDia(dia: string, event: Event): void {
    const marcado = (event.target as HTMLInputElement).checked;

    const atuais: string[] = this.formUnidade.get('diasFuncionamento')?.value || [];

    const novos = marcado ? [...atuais, dia] : atuais.filter((d) => d !== dia);

    const controle = this.formUnidade.get('diasFuncionamento');
    controle?.setValue(novos);
    controle?.markAsDirty();
    controle?.markAsTouched();

    this.verificarErros();
  }

  formatarHorario(valor: string | null | undefined): string {
    return valor ? valor.substring(0, 5) : '-';
  }

  salvar(): void {
    this.formUnidade.markAllAsTouched();
    this.checarHorarios();
    this.checarFaixaEtaria();
    this.verificarErros();

    if (this.formUnidade.invalid) {
      return;
    }

    if (this.modoEdicao && !this.temAlteracoes) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoading = true;

    if (this.modoEdicao) {
      this.atualizarUnidade();
      return;
    }

    this.criarUnidade();
  }

  salvarTurma(): void {
    this.formTurma.markAllAsTouched();
    this.checarHorariosTurma();
    this.verificarErrosTurma();

    if (this.formTurma.invalid || this.unidades.length === 0) {
      return;
    }

    if (this.modoEdicaoTurma && !this.temAlteracoesTurma) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoadingTurma = true;

    if (this.modoEdicaoTurma) {
      this.atualizarTurma();
      return;
    }

    this.criarTurma();
  }

  executarAcao(evento: { tipo: string; linha: Unidade }): void {
    if (evento.tipo === 'visualizar') {
      this.abrirVisualizacao(evento.linha);
      return;
    }

    if (evento.tipo === 'editar') {
      this.abrirEdicao(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir') {
      this.deletarUnidade(evento.linha);
    }
  }

  executarAcaoTurma(evento: { tipo: string; linha: Turma }): void {
    if (evento.tipo === 'editar') {
      this.abrirEdicaoTurma(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir') {
      this.deletarTurma(evento.linha);
    }
  }

  abrirVisualizacao(unidade: Unidade): void {
    this.unidadeVisualizacao = unidade;
    this.modalVisualizacaoAberto = true;
  }

  fecharVisualizacao(): void {
    this.modalVisualizacaoAberto = false;
    this.unidadeVisualizacao = null;
  }

  deletarUnidade(unidade: Unidade): void {
    Alertas.confirmarExclusao().then((confirmado: boolean) => {
      if (!confirmado) {
        return;
      }

      this.isLoading = true;

      this.unidadeService.deletar(unidade.id).subscribe({
        next: () => {
          this.isLoading = false;
          this.carregarUnidades();
          this.toastr.success('Unidade excluída com sucesso.', 'Sucesso');
        },
        error: () => {
          this.isLoading = false;
          this.toastr.error('Erro ao excluir unidade.', 'Erro');
          this.cdr.detectChanges();
        },
      });
    });
  }

  deletarTurma(turma: Turma): void {
    const mensagem =
      `A turma de ${this.formatarPeriodo(turma.periodo)} ` +
      `(${this.formatarHorario(turma.horaInicio)} às ${this.formatarHorario(turma.horaFim)}) ` +
      `da unidade ${turma.unidade?.nome || '-'} será excluída.`;

    Alertas.confirmarExclusao(mensagem).then((confirmado: boolean) => {
      if (!confirmado) {
        return;
      }

      this.isLoadingTurma = true;

      this.turmaService.deletar(turma.id).subscribe({
        next: () => {
          this.isLoadingTurma = false;
          this.carregarTurmas();
          this.toastr.success('Turma excluída com sucesso.', 'Sucesso');
        },
        error: () => {
          this.isLoadingTurma = false;
          this.toastr.error('Erro ao excluir turma.', 'Erro');
          this.cdr.detectChanges();
        },
      });
    });
  }

  private criarUnidade(): void {
    const dto: CriarUnidadeDTO = this.montarDto();

    this.unidadeService.criar(dto).subscribe({
      next: () => {
        this.isLoading = false;
        this.fecharModalSemConfirmacao();
        this.carregarUnidades();
        this.toastr.success('Unidade cadastrada com sucesso.', 'Sucesso');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastr.error(err.error?.message || 'Erro ao cadastrar unidade.', 'Erro');
        this.cdr.detectChanges();
      },
    });
  }

  private atualizarUnidade(): void {
    const dto: AtualizarUnidadeDTO = this.montarDto();

    this.unidadeService.atualizar(this.unidadeSelecionadaId!, dto).subscribe({
      next: () => {
        this.isLoading = false;
        this.fecharModalSemConfirmacao();
        this.carregarUnidades();
        this.toastr.success('Unidade atualizada com sucesso.', 'Sucesso');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastr.error(err.error?.message || 'Erro ao atualizar unidade.', 'Erro');
        this.cdr.detectChanges();
      },
    });
  }

  private montarDto(): CriarUnidadeDTO {
    const valores = this.formUnidade.value;

    return {
      nome: valores.nome,
      endereco: valores.endereco,
      telefone: valores.telefone,
      email: valores.email,
      diasFuncionamento: this.ordenarDias(valores.diasFuncionamento).join(';'),
      horarioAbertura: valores.horarioAbertura,
      horarioFechamento: valores.horarioFechamento,
      idadeMin: Number(valores.idadeMin),
      idadeMax: Number(valores.idadeMax),
      corHex: valores.corHex || this.corPadrao,
      imagem: this.imagemSelecionada ?? undefined,
    };
  }

  private criarTurma(): void {
    const dto: CriarTurmaDTO = this.montarDtoTurma();

    this.turmaService.criar(dto).subscribe({
      next: () => {
        this.isLoadingTurma = false;
        this.fecharModalTurmaSemConfirmacao();
        this.carregarTurmas();
        this.toastr.success('Turma cadastrada com sucesso.', 'Sucesso');
      },
      error: (err: any) => {
        this.isLoadingTurma = false;
        this.tratarErroTurma(err, 'Erro ao cadastrar turma.');
      },
    });
  }

  private atualizarTurma(): void {
    const dto: AtualizarTurmaDTO = this.montarDtoTurma();

    this.turmaService.atualizar(this.turmaSelecionadaId!, dto).subscribe({
      next: () => {
        this.isLoadingTurma = false;
        this.fecharModalTurmaSemConfirmacao();
        this.carregarTurmas();
        this.toastr.success('Turma atualizada com sucesso.', 'Sucesso');
      },
      error: (err: any) => {
        this.isLoadingTurma = false;

        if (err.status === 404) {
          this.toastr.error('Esta turma não existe mais.', 'Erro');
          this.fecharModalTurmaSemConfirmacao();
          this.carregarTurmas();
          return;
        }

        this.tratarErroTurma(err, 'Erro ao atualizar turma.');
      },
    });
  }

  private tratarErroTurma(err: any, mensagemPadrao: string): void {
    if (err.status === 400 && Array.isArray(err.error?.errors)) {
      const mapeados: { [key: string]: string } = {};

      for (const erro of err.error.errors) {
        if (erro?.field) {
          mapeados[erro.field] = erro.defaultMessage || mensagemPadrao;
        }
      }

      this.errosTurma = { ...this.errosTurma, ...mapeados };
      this.cdr.detectChanges();
      return;
    }

    this.toastr.error(err.error?.message || mensagemPadrao, 'Erro');
    this.cdr.detectChanges();
  }

  private montarDtoTurma(): CriarTurmaDTO {
    const valores = this.formTurma.value;

    return {
      periodo: valores.periodo,
      horaInicio: valores.horaInicio,
      horaFim: valores.horaFim,
      unidadeId: Number(valores.unidadeId),
    };
  }

  private checarHorariosTurma(): void {
    const inicio = this.formTurma.get('horaInicio');
    const fim = this.formTurma.get('horaFim');

    if (!inicio || !fim) {
      return;
    }

    if (inicio.value && fim.value && inicio.value >= fim.value) {
      fim.setErrors({
        ...(fim.errors || {}),
        horarioInvalido: true,
      });
      return;
    }

    if (fim.hasError('horarioInvalido')) {
      const { horarioInvalido, ...errosRestantes } = fim.errors || {};

      fim.setErrors(Object.keys(errosRestantes).length ? errosRestantes : null);
    }
  }

  private checarHorarios(): void {
    const abertura = this.formUnidade.get('horarioAbertura');
    const fechamento = this.formUnidade.get('horarioFechamento');

    if (!abertura || !fechamento) {
      return;
    }

    if (abertura.value && fechamento.value && abertura.value >= fechamento.value) {
      fechamento.setErrors({
        ...(fechamento.errors || {}),
        horarioInvalido: true,
      });
      return;
    }

    if (fechamento.hasError('horarioInvalido')) {
      const { horarioInvalido, ...errosRestantes } = fechamento.errors || {};

      fechamento.setErrors(Object.keys(errosRestantes).length ? errosRestantes : null);
    }
  }

  private checarFaixaEtaria(): void {
    const idadeMin = this.formUnidade.get('idadeMin');
    const idadeMax = this.formUnidade.get('idadeMax');

    if (!idadeMin || !idadeMax) {
      return;
    }

    if (
      idadeMin.value !== '' &&
      idadeMax.value !== '' &&
      Number(idadeMin.value) > Number(idadeMax.value)
    ) {
      idadeMax.setErrors({
        ...(idadeMax.errors || {}),
        idadeInvalida: true,
      });
      return;
    }

    if (idadeMax.hasError('idadeInvalida')) {
      const { idadeInvalida, ...errosRestantes } = idadeMax.errors || {};

      idadeMax.setErrors(Object.keys(errosRestantes).length ? errosRestantes : null);
    }
  }

  formatarDiasFuncionamento(valor: string): string {
    const dias = this.separarDias(valor);

    if (!dias.length) {
      return '-';
    }

    const todos = [...this.diasUteis, 'SAB', 'DOM'];

    if (this.mesmoConjunto(dias, todos)) {
      return 'Todos os dias';
    }

    if (this.mesmoConjunto(dias, this.diasUteis)) {
      return 'Segunda a Sexta';
    }

    return this.ordenarDias(dias)
      .map((dia) => this.diasSemana.find((d) => d.valor === dia)?.label || dia)
      .join(', ');
  }

  private separarDias(valor: string | null | undefined): string[] {
    return (valor || '')
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean);
  }

  private ordenarDias(dias: string[]): string[] {
    return this.diasSemana.map((d) => d.valor).filter((valor) => dias.includes(valor));
  }

  private mesmoConjunto(a: string[], b: string[]): boolean {
    return a.length === b.length && b.every((valor) => a.includes(valor));
  }

  private paraInputHorario(valor: string | null | undefined): string {
    return valor ? valor.substring(0, 5) : '';
  }

  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
    this.modalTremendo = false;
    this.isLoading = false;
    this.unidadeSelecionadaId = null;
    this.erros = {};
    this.valoresOriginaisDoFormulario = null;
    this.imagemPreview = null;
    this.nomeArquivoSelecionado = '';
    this.imagemSelecionada = null;

    this.formUnidade.reset({
      nome: '',
      endereco: '',
      telefone: '',
      email: '',
      diasFuncionamento: [],
      horarioAbertura: '',
      horarioFechamento: '',
      idadeMin: '',
      idadeMax: '',
      corHex: this.corPadrao,
      imagem: null,
    });

    this.formUnidade.markAsPristine();
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;

    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  private fecharModalTurmaSemConfirmacao(): void {
    this.modalTurmaAberto = false;
    this.modalTurmaTremendo = false;
    this.isLoadingTurma = false;
    this.turmaSelecionadaId = null;
    this.errosTurma = {};
    this.valoresOriginaisFormTurma = null;

    this.formTurma.reset({
      periodo: '',
      horaInicio: '',
      horaFim: '',
      unidadeId: null,
    });

    this.formTurma.markAsPristine();
  }

  private dispararTremorModalTurma(): void {
    this.modalTurmaTremendo = true;

    setTimeout(() => {
      this.modalTurmaTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }
}
