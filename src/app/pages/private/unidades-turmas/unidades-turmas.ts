import {
  ChangeDetectorRef,
  Component,
  HostListener,
  NgZone,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ToastrService } from 'ngx-toastr';

import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaAcao,
  TabelaColuna,
  TabelaLayout
} from '@components/tabela-layout/tabela-layout';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { AtualizarUnidadeDTO, CriarUnidadeDTO, Unidade } from 'src/app/shared/models/unidade.model';
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario, validarImagem } from 'src/app/shared/utils/form-validations';
import { formatarTelefone } from 'src/app/shared/utils/masks';
import { environment } from 'src/environments/environment';

type DiaSemana = { valor: string; label: string };

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
    MatInputModule
  ],
  templateUrl: './unidades-turmas.html',
  styleUrl: './unidades-turmas.css',
})
export class UnidadesTurmas
  implements OnInit, ComponentComAlteracoesNaoSalvas {

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
    { valor: 'DOM', label: 'Domingo' }
  ];

  private readonly diasUteis = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];

  private readonly mensagensCustomizadas:
    Record<string, Record<string, string>> = {
    telefone: {
      minlength: 'Telefone incompleto.',
      maxlength: 'Telefone incompleto.'
    },
    diasFuncionamento: {
      required: 'Selecione ao menos um dia de funcionamento.'
    },
    horarioFechamento: {
      horarioInvalido: 'O horário de fechamento deve ser depois da abertura.'
    },
    idadeMax: {
      idadeInvalida: 'A idade máxima não pode ser menor que a mínima.'
    }
  };

  colunas: TabelaColuna<Unidade>[] = [
    {
      chave: 'nome',
      titulo: 'Nome',
      principalMobile: true
    },
    {
      chave: 'endereco',
      titulo: 'Endereço'
    },
    {
      chave: 'telefone',
      titulo: 'Telefone'
    },
    {
      chave: 'horarioAbertura',
      titulo: 'Horário',
      formatar: (_valor: string, linha: Unidade) =>
        `${this.formatarHorario(linha.horarioAbertura)} às ${this.formatarHorario(linha.horarioFechamento)}`
    }
  ];

  acoesTabela: TabelaAcao<Unidade>[] = [
    {
      icone: 'visibility',
      tooltip: 'Visualizar',
      acao: 'visualizar'
    },
    {
      icone: 'edit',
      tooltip: 'Editar',
      acao: 'editar'
    },
    {
      icone: 'delete',
      tooltip: 'Excluir',
      acao: 'excluir'
    }
  ];

  constructor(
    private unidadeService: UnidadeService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private ngZone: NgZone
  ) {
    this.formUnidade = this.fb.group({
      nome: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      endereco: [
        '',
        [Validators.required, Validators.maxLength(255)]
      ],
      telefone: [
        '',
        [
          Validators.required,
          Validators.minLength(14),
          Validators.maxLength(15)
        ]
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(100)
        ]
      ],
      diasFuncionamento: [
        [] as string[],
        Validators.required
      ],
      horarioAbertura: [
        '',
        Validators.required
      ],
      horarioFechamento: [
        '',
        Validators.required
      ],
      idadeMin: [
        '',
        [Validators.required, Validators.min(0)]
      ],
      idadeMax: [
        '',
        [Validators.required, Validators.min(0)]
      ],
      corHex: [this.corPadrao],
      imagem: [null, [validarImagem()]]
    });
  }

  ngOnInit(): void {
    this.carregarUnidades();

    this.formUnidade
      .get('horarioAbertura')
      ?.valueChanges
      .subscribe(() => this.checarHorarios());

    this.formUnidade
      .get('horarioFechamento')
      ?.valueChanges
      .subscribe(() => this.checarHorarios());

    this.formUnidade
      .get('idadeMin')
      ?.valueChanges
      .subscribe(() => this.checarFaixaEtaria());

    this.formUnidade
      .get('idadeMax')
      ?.valueChanges
      .subscribe(() => this.checarFaixaEtaria());
  }

  get mensagemVazia(): string {
    return 'Nenhuma unidade cadastrada ainda';
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

  carregarUnidades(): void {
    this.unidadeService
      .listarTodas()
      .subscribe({
        next: (dados: Unidade[]) => {
          this.ngZone.run(() => {
            this.unidades = [...dados];
            this.cdr.detectChanges();
          });
        },

        error: (err: any) => {
          console.error(
            'Erro na API:',
            err
          );

          this.toastr.error(
            'Não foi possível carregar a lista de unidades.',
            'Erro'
          );

          this.cdr.detectChanges();
        }
      });
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
      imagem: null
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
      imagem: null
    });

    this.formUnidade.markAsPristine();
    this.valoresOriginaisDoFormulario =
      this.formUnidade.getRawValue();
    this.modalAberto = true;
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
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      this.fecharModalSemConfirmacao();
      return;
    }

    Alertas
      .confirmarDescarte()
      .then((confirmado: boolean) => {
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

  formularioTemAlteracoesNaoSalvas(): boolean {
    if (!this.modalAberto) {
      return false;
    }

    return this.temAlteracoes;
  }

  @HostListener(
    'window:beforeunload',
    ['$event']
  )
  avisarAntesDeFechar(
    event: BeforeUnloadEvent
  ): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  verificarErros(): void {
    this.erros =
      mapearErrosFormulario(
        this.formUnidade,
        this.mensagensCustomizadas
      );
  }

  aplicarMascaraTelefone(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    this.formUnidade
      .get('telefone')
      ?.setValue(
        formatarTelefone(input.value),
        { emitEvent: false }
      );

    this.verificarErros();
  }

  diaSelecionado(dia: string): boolean {
    const atuais: string[] =
      this.formUnidade.get('diasFuncionamento')?.value || [];

    return atuais.includes(dia);
  }

  toggleDia(dia: string, event: Event): void {
    const marcado =
      (event.target as HTMLInputElement).checked;

    const atuais: string[] =
      this.formUnidade.get('diasFuncionamento')?.value || [];

    const novos = marcado
      ? [...atuais, dia]
      : atuais.filter(d => d !== dia);

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

    if (
      this.modoEdicao &&
      !this.temAlteracoes
    ) {
      this.toastr.info(
        'Nenhum dado foi alterado.',
        'Aviso'
      );
      return;
    }

    this.isLoading = true;

    if (this.modoEdicao) {
      this.atualizarUnidade();
      return;
    }

    this.criarUnidade();
  }

  executarAcao(
    evento: {
      tipo: string;
      linha: Unidade;
    }
  ): void {
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

  abrirVisualizacao(unidade: Unidade): void {
    this.unidadeVisualizacao = unidade;
    this.modalVisualizacaoAberto = true;
  }

  fecharVisualizacao(): void {
    this.modalVisualizacaoAberto = false;
    this.unidadeVisualizacao = null;
  }

  deletarUnidade(
    unidade: Unidade
  ): void {
    Alertas
      .confirmarExclusao()
      .then((confirmado: boolean) => {
        if (!confirmado) {
          return;
        }

        this.isLoading = true;

        this.unidadeService
          .deletar(unidade.id)
          .subscribe({
            next: () => {
              this.isLoading = false;
              this.carregarUnidades();
              this.toastr.success(
                'Unidade excluída com sucesso.',
                'Sucesso'
              );
            },
            error: () => {
              this.isLoading = false;
              this.toastr.error(
                'Erro ao excluir unidade.',
                'Erro'
              );
              this.cdr.detectChanges();
            }
          });
      });
  }

  private criarUnidade(): void {
    const dto: CriarUnidadeDTO = this.montarDto();

    this.unidadeService
      .criar(dto)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarUnidades();
          this.toastr.success(
            'Unidade cadastrada com sucesso.',
            'Sucesso'
          );
        },
        error: (err: any) => {
          this.isLoading = false;
          this.toastr.error(
            err.error?.message ||
            'Erro ao cadastrar unidade.',
            'Erro'
          );
          this.cdr.detectChanges();
        }
      });
  }

  private atualizarUnidade(): void {
    const dto: AtualizarUnidadeDTO = this.montarDto();

    this.unidadeService
      .atualizar(
        this.unidadeSelecionadaId!,
        dto
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarUnidades();
          this.toastr.success(
            'Unidade atualizada com sucesso.',
            'Sucesso'
          );
        },
        error: (err: any) => {
          this.isLoading = false;
          this.toastr.error(
            err.error?.message ||
            'Erro ao atualizar unidade.',
            'Erro'
          );
          this.cdr.detectChanges();
        }
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
      imagem: this.imagemSelecionada ?? undefined
    };
  }

  private checarHorarios(): void {
    const abertura = this.formUnidade.get('horarioAbertura');
    const fechamento = this.formUnidade.get('horarioFechamento');

    if (!abertura || !fechamento) {
      return;
    }

    if (
      abertura.value &&
      fechamento.value &&
      abertura.value >= fechamento.value
    ) {
      fechamento.setErrors({
        ...(fechamento.errors || {}),
        horarioInvalido: true
      });
      return;
    }

    if (fechamento.hasError('horarioInvalido')) {
      const {
        horarioInvalido,
        ...errosRestantes
      } = fechamento.errors || {};

      fechamento.setErrors(
        Object.keys(errosRestantes).length
          ? errosRestantes
          : null
      );
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
        idadeInvalida: true
      });
      return;
    }

    if (idadeMax.hasError('idadeInvalida')) {
      const {
        idadeInvalida,
        ...errosRestantes
      } = idadeMax.errors || {};

      idadeMax.setErrors(
        Object.keys(errosRestantes).length
          ? errosRestantes
          : null
      );
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
      .map(dia => this.diasSemana.find(d => d.valor === dia)?.label || dia)
      .join(', ');
  }

  private separarDias(valor: string | null | undefined): string[] {
    return (valor || '')
      .split(';')
      .map(d => d.trim())
      .filter(Boolean);
  }

  private ordenarDias(dias: string[]): string[] {
    return this.diasSemana
      .map(d => d.valor)
      .filter(valor => dias.includes(valor));
  }

  private mesmoConjunto(a: string[], b: string[]): boolean {
    return a.length === b.length && b.every(valor => a.includes(valor));
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
      imagem: null
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
}
