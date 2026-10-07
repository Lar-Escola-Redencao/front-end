import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, debounceTime, filter, map } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { ToastrService } from 'ngx-toastr';

import { CampoBusca } from '@components/campo-busca/campo-busca';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaAcao,
  TabelaColuna,
  TabelaLayout
} from '@components/tabela-layout/tabela-layout';

import { Paginacao } from '@components/paginacao/paginacao';
import { BarraBusca } from '@components/barra-busca/barra-busca';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { AtualizarColaboradorDTO, Colaborador, CriarColaboradorDTO } from 'src/app/shared/models/colaborador.model';
import { Auth } from 'src/app/shared/services/auth/auth';
import { ColaboradorService } from 'src/app/shared/services/colaborador/colaborador.service';
import { PapelService } from 'src/app/shared/services/colaborador/papel.service';
import { UnidadeService } from 'src/app/shared/services/colaborador/unidade.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import {
  CampoOrdenacao,
  alternarOrdenacao,
  analisarOrdenacao,
  lerParametrosPagina
} from 'src/app/shared/utils/paginacao-url';
import {
  formatarCpf,
  formatarTelefone
} from 'src/app/shared/utils/masks';

type Papel = {
  id: number;
  nome?: string;
  nomePapel?: string;
};

type Unidade = {
  id: number;
  nome: string;
};

@Component({
  selector: 'app-colaborador',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    Paginacao,
<<<<<<< HEAD
    CampoBusca,
=======
    BarraBusca,
>>>>>>> teste-dev
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './colaborador.component.html',
  styleUrls: ['./colaborador.component.css']
})
export class ColaboradorComponent
  implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  colaboradores: Colaborador[] = [];
  papeisDisponiveis: string[] = [];
  papeis: Papel[] = [];

  // Filtro por papel agora é feito no back-end (idPapel), não em memória.
  filtroPapel: number | null = null;

  /** Termo da barra de busca, espelhado em ?search= na URL. */
  busca = '';

  unidadesDisponiveis: Unidade[] = [];

  // Omnisearch: o termo vai para a URL (?search=) e o back busca em todas as colunas.
  readonly campoBusca = new FormControl<string>('');
  busca = '';
  private readonly destroyRef = inject(DestroyRef);
  private listaSub?: Subscription;

  pagina = 0;
  tamanho = 10;
  sort: string | undefined;
  ordenacao: CampoOrdenacao | null = null;
  totalElementos = 0;
  totalPaginas = 0;
  carregandoLista = false;
  erroLista = false;

  private routeSub?: Subscription;
  private papelSub?: Subscription;
  private listaSub?: Subscription;

  modalAberto = false;
  modoEdicao = false;
  colaboradorSelecionadoId: number | null = null;
  formColaborador: FormGroup;
  erros: { [key: string]: string } = {};
  mostrarSenha = false;
  mostrarConfirmarSenha = false;
  isLoading = false;
  modalTremendo = false;
  valoresOriginaisDoFormulario: any = null;
  private readonly senhaRegex =
    /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;
  private readonly nomesPapel: Record<string, string> = {
    ADMINISTRADOR: 'Administrador',
    COLABORADOR: 'Colaborador'
  };

  private readonly mensagensCustomizadas:
    Record<string, Record<string, string>> = {
    senha: {
      pattern:
        'A senha não contem os requisitos minimos.'
    },
    confirmarSenha: {
      senhasDiferentes:
        'As senhas não coincidem.'
    },
    cpf: {
      minlength: 'CPF incompleto.',
      maxlength: 'CPF incompleto.'
    },
    telefone: {
      minlength: 'Telefone incompleto.',
      maxlength: 'Telefone incompleto.'
    }
  };

  colunas: TabelaColuna<Colaborador>[] = [
    {
      chave: 'nomeCompleto',
      titulo: 'Nome',
      principalMobile: true,
      ordenavel: true
    },
    {
      chave: 'email',
      titulo: 'E-mail',
      ordenavel: true
    },
    {
      chave: 'cpf',
      titulo: 'CPF',
      ordenavel: true
    },
    {
      chave: 'nomePapel',
      titulo: 'Papel',
      formatar: (valor) => this.formatarTextoExibicao(String(valor || '')),
      ordenavel: true,
      campoOrdenacao: 'papel.nomePapel'
    }
  ];

  acoesTabela: TabelaAcao<Colaborador>[] = [
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
    private colaboradorService: ColaboradorService,
    private papelService: PapelService,
    private unidadeService: UnidadeService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth
  ) {
    this.formColaborador = this.fb.group({
      nomeCompleto: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(60)
        ]
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.minLength(5),
          Validators.maxLength(100)
        ]
      ],
      senha: [''],
      confirmarSenha: [''],
      cpf: [
        '',
        [
          Validators.required,
          Validators.minLength(14),
          Validators.maxLength(14)
        ]
      ],
      endereco: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(150)
        ]
      ],
      telefone: [
        '',
        [
          Validators.required,
          Validators.minLength(14),
          Validators.maxLength(15)
        ]
      ],
      idPapel: [
        null,
        Validators.required
      ],
      idsUnidades: [
        [],
        Validators.required
      ]
    });
    this.papelSub = this.formColaborador.get('idPapel')!.valueChanges.subscribe(() => {
      this.atualizarCampoUnidades();
    });
  }

  ngOnInit(): void {
    this.carregarPapeis();
    this.carregarUnidades();

    // A carga inicial de colaboradores acontece via queryParamMap abaixo
    // (ele dispara mesmo sem parâmetros na URL na primeira emissão),
    // então não chamamos carregarColaboradores() duas vezes aqui.
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);

      const papelBruto = Number(params.get('papel'));
      this.filtroPapel = Number.isFinite(papelBruto) && papelBruto > 0
        ? papelBruto
        : null;

      this.busca = params.get('search') ?? '';
<<<<<<< HEAD
      if (this.campoBusca.value !== this.busca) {
        this.campoBusca.setValue(this.busca, { emitEvent: false });
      }
=======
>>>>>>> teste-dev

      this.carregarColaboradores();
    });

    // Só consulta a API 500ms depois que o usuário para de digitar.
    this.campoBusca.valueChanges
      .pipe(
        debounceTime(500),
        map(valor => (valor ?? '').trim()),
        filter(termo => termo !== this.busca),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(termo => this.buscar(termo));

    this.formColaborador
      .get('senha')
      ?.valueChanges
      .subscribe(() => this.checarSenhasIguais());

    this.formColaborador
      .get('confirmarSenha')
      ?.valueChanges
      .subscribe(() => this.checarSenhasIguais());
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
<<<<<<< HEAD
=======
    this.papelSub?.unsubscribe();
>>>>>>> teste-dev
    this.listaSub?.unsubscribe();
  }

  get mensagemVazia(): string {
    if (this.busca) {
      return `Nenhum colaborador encontrado para "${this.busca}"`;
    }
    const papelSelecionado = this.papeis.find(p => p.id === this.filtroPapel);
    return papelSelecionado
      ? `Nenhum colaborador com o papel ${this.obterNomePapel(papelSelecionado)} cadastrado ainda`
      : 'Nenhum colaborador cadastrado ainda';
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao) {
      return this.formColaborador.dirty;
    }

    return (
      JSON.stringify(this.formColaborador.getRawValue()) !==
      JSON.stringify(this.valoresOriginaisDoFormulario)
    );
  }

  /** Coordenador só faz a gestão de monitores; administrador vê e gerencia todos os papéis. */
  get somenteMonitores(): boolean {
    return this.auth.hasRole('COORDENADOR');
  }

  private get idPapelMonitor(): number | null {
    return this.papeis.find(p => (p.nomePapel || p.nome || '').toUpperCase() === 'MONITOR')?.id ?? null;
  }

  get papelSelecionadoAdministrador(): boolean {
    const papel = this.papeis.find(p => p.id === this.formColaborador.get('idPapel')?.value);
    return (papel?.nomePapel || papel?.nome || '').toUpperCase() === 'ADMINISTRADOR';
  }

  private atualizarCampoUnidades(): void {
    const unidades = this.formColaborador.get('idsUnidades')!;
    if (this.papelSelecionadoAdministrador) unidades.disable({ emitEvent: false });
    else unidades.enable({ emitEvent: false });
  }

  carregarPapeis(): void {
    this.papelService.listarTodos().subscribe({
      next: (dados: Papel[]) => {
        this.papeis = this.somenteMonitores
          ? dados.filter(p => (p.nomePapel || p.nome || '').toUpperCase() === 'MONITOR')
          : dados;
        if (this.somenteMonitores) {
          this.carregarColaboradores();
        }
        this.papeisDisponiveis = this.papeis
          .map((papel) => this.obterNomePapel(papel))
          .filter((nome): nome is string => Boolean(nome));
        this.atualizarCampoUnidades();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erro ao carregar papéis da API:', err);
      }
    });
  }

  carregarUnidades(): void {
    this.unidadeService
      .listarTodos()
      .subscribe({
        next: (dados: Unidade[]) => {
          this.unidadesDisponiveis = dados;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(
            'Erro ao carregar unidades da API:',
            err
          );
        }
      });
  }

  carregarColaboradores(): void {
<<<<<<< HEAD
=======
    // Uma nova busca/filtro cancela a requisição anterior em andamento: vale sempre a mais recente.
    this.listaSub?.unsubscribe();

>>>>>>> teste-dev
    // Para o coordenador a lista é sempre restrita a monitores; aguarda os papéis
    // carregarem para saber o id do papel MONITOR (carregarPapeis recarrega a lista).
    if (this.somenteMonitores && this.idPapelMonitor === null) {
      return;
    }

    this.carregandoLista = true;
    this.erroLista = false;

    const idPapel = this.somenteMonitores
      ? this.idPapelMonitor!
      : this.filtroPapel ?? undefined;

<<<<<<< HEAD
    // Cancela a requisição anterior para uma resposta antiga não sobrescrever a busca atual.
    this.listaSub?.unsubscribe();
=======
>>>>>>> teste-dev
    this.listaSub = this.colaboradorService
      .listarTodos(this.pagina, this.tamanho, this.sort, idPapel, this.busca || undefined)
      .subscribe({
        next: (resposta) => {
          this.ngZone.run(() => {
            this.colaboradores = [...resposta.content];
            this.totalElementos = resposta.page.totalElements;
            this.totalPaginas = resposta.page.totalPages;

            this.carregandoLista = false;
            this.cdr.detectChanges();
          });
        },

        error: (err: any) => {
          console.error(
            'Erro na API:',
            err
          );

          this.carregandoLista = false;
          this.erroLista = true;

          this.toastr.error(
            'Não foi possivel carregar a lista de usuarios.',
            'Erro'
          );

          this.cdr.detectChanges();
        }
      });
  }

  /** Atualiza a URL (?papel=id); o próprio queryParamMap.subscribe recarrega a lista. */
  filtrarPorPapel(idPapel: number | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { papel: idPapel || null, page: 0 },
      queryParamsHandling: 'merge'
    });
  }

  /** Atualiza a URL (?search=termo) voltando para a primeira página; o queryParamMap recarrega a lista. */
  buscar(termo: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: termo || null, page: 0 },
      queryParamsHandling: 'merge'
    });
  }

  removerFiltroPapel(): void {
    this.filtrarPorPapel(null);
  }

  /** Atualiza a URL (?search=termo); o queryParamMap.subscribe refaz o GET sem recarregar a página. */
  buscar(termo: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: termo || null, page: 0 },
      queryParamsHandling: 'merge'
    });
  }

  ordenarPor(campo: string): void {
    const novoSort = alternarOrdenacao(this.ordenacao, campo);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: novoSort },
      queryParamsHandling: 'merge'
    });
  }

  irParaPagina(novaPagina: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: novaPagina },
      queryParamsHandling: 'merge'
    });
  }

  mudarTamanhoPagina(novoTamanho: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { size: novoTamanho, page: 0 },
      queryParamsHandling: 'merge'
    });
  }

  isUnidadeSelecionada(id: number): boolean {
    const selecionados: number[] = this.formColaborador.get('idsUnidades')?.value || [];
    return selecionados.includes(id);
  }

  onUnidadeToggle(id: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const selecionados: number[] = [...(this.formColaborador.get('idsUnidades')?.value || [])];

    if (checkbox.checked && !selecionados.includes(id)) {
      selecionados.push(id);
    }

    if (!checkbox.checked) {
      const index = selecionados.indexOf(id);
      if (index !== -1) selecionados.splice(index, 1);
    }

    this.formColaborador.patchValue({ idsUnidades: selecionados });
    this.formColaborador.get('idsUnidades')?.markAsDirty();
    this.formColaborador.markAsDirty();
  }

  abrirCadastro(): void {
    this.modoEdicao = false;
    this.colaboradorSelecionadoId = null;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;
    this.modalTremendo = false;
    this.valoresOriginaisDoFormulario = null;

    this.formColaborador
      .get('senha')
      ?.setValidators([
        Validators.required,
        Validators.pattern(this.senhaRegex),
        Validators.maxLength(50)
      ]);

    this.formColaborador
      .get('confirmarSenha')
      ?.setValidators([
        Validators.required
      ]);

    this.formColaborador.reset({
      nomeCompleto: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      cpf: '',
      endereco: '',
      telefone: '',
      idPapel: this.somenteMonitores ? this.idPapelMonitor : null,
      idsUnidades: []
    });

    this.atualizarValidadoresSenha();
    this.formColaborador.markAsPristine();
    this.modalAberto = true;
    this.cdr.detectChanges();
  }

  abrirEdicao(colaborador: Colaborador): void {
    this.modoEdicao = true;
    this.colaboradorSelecionadoId = colaborador.id;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;
    this.modalTremendo = false;

    this.formColaborador
      .get('senha')
      ?.clearValidators();

    this.formColaborador
      .get('confirmarSenha')
      ?.clearValidators();

    this.formColaborador.reset({
      nomeCompleto: colaborador.nomeCompleto,
      email: colaborador.email,
      senha: '',
      confirmarSenha: '',
      cpf: formatarCpf(colaborador.cpf),
      endereco: colaborador.endereco,
      telefone: formatarTelefone(colaborador.telefone),
      idPapel: colaborador.idPapel,
      idsUnidades: colaborador.unidades?.map(u => u.id) || []
    });

    this.atualizarValidadoresSenha();
    this.formColaborador.markAsPristine();
    this.valoresOriginaisDoFormulario =
      this.formColaborador.getRawValue();
    this.modalAberto = true;
    this.cdr.detectChanges();
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
        this.formColaborador,
        this.mensagensCustomizadas
      );
  }

  aplicarMascaraCpf(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    this.formColaborador
      .get('cpf')
      ?.setValue(
        formatarCpf(input.value),
        { emitEvent: false }
      );

    this.verificarErros();
  }

  aplicarMascaraTelefone(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    this.formColaborador
      .get('telefone')
      ?.setValue(
        formatarTelefone(input.value),
        { emitEvent: false }
      );

    this.verificarErros();
  }

  alternarVisibilidadeSenha(
    campo: 'senha' | 'confirmarSenha'
  ): void {
    if (campo === 'senha') {
      this.mostrarSenha = !this.mostrarSenha;
      return;
    }

    this.mostrarConfirmarSenha =
      !this.mostrarConfirmarSenha;
  }

  salvar(): void {
    this.formColaborador.markAllAsTouched();
    this.checarSenhasIguais();
    this.verificarErros();

    if (this.formColaborador.invalid) {
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
      this.atualizarColaborador();
      return;
    }

    this.criarColaborador();
  }

  executarAcao(
    evento: {
      tipo: string;
      linha: Colaborador;
    }
  ): void {
    if (evento.tipo === 'editar') {
      this.abrirEdicao(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir') {
      this.deletarColaborador(evento.linha);
    }
  }

  deletarColaborador(
    colaborador: Colaborador
  ): void {
    Alertas
      .confirmarExclusao()
      .then((confirmado: boolean) => {
        if (!confirmado) {
          return;
        }

        this.isLoading = true;

        this.colaboradorService
          .deletar(colaborador.id)
          .subscribe({
            next: () => {
              this.isLoading = false;
              this.carregarColaboradores();
              this.toastr.success(
                'Usuario excluido com sucesso.',
                'Sucesso'
              );
            },
            error: () => {
              this.isLoading = false;
              this.toastr.error(
                'Erro ao excluir colaborador.',
                'Erro'
              );
              this.cdr.detectChanges();
            }
          });
      });
  }

  obterNomePapel(papel: Papel): string {
    return this.formatarTextoExibicao(papel.nomePapel || papel.nome || '');
  }

  private formatarTextoExibicao(valor: string | null | undefined): string {
    if (!valor) {
      return '';
    }

    const textoMapeado = this.nomesPapel[valor];

    if (textoMapeado) {
      return textoMapeado;
    }

    return valor
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letra) => letra.toUpperCase());
  }

  private criarColaborador(): void {
    const {
      confirmarSenha,
      ...dadosCadastro
    } = this.formColaborador.value;

    const dto: CriarColaboradorDTO =
      dadosCadastro;

    this.colaboradorService
      .criar(dto)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarColaboradores();
          this.toastr.success(
            'Usuario cadastrado com sucesso.',
            'Sucesso'
          );
        },
        error: (err: any) => {
          this.isLoading = false;
          this.toastr.error(
            err.error?.message ||
            'Erro ao cadastrar colaborador',
            'Erro'
          );
          this.cdr.detectChanges();
        }
      });
  }

  private atualizarColaborador(): void {
    const {
      senha,
      confirmarSenha,
      ...dadosEdicao
    } = this.formColaborador.value;

    const dto: AtualizarColaboradorDTO =
      dadosEdicao;

    this.colaboradorService
      .atualizar(
        this.colaboradorSelecionadoId!,
        dto
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarColaboradores();
          this.toastr.success(
            'Usuario atualizado com sucesso.',
            'Sucesso'
          );
        },
        error: (err: any) => {
          this.isLoading = false;
          this.toastr.error(
            err.error?.message ||
            'Erro ao atualizar colaborador',
            'Erro'
          );
          this.cdr.detectChanges();
        }
      });
  }

  private checarSenhasIguais(): void {
    if (this.modoEdicao) {
      return;
    }

    const senha =
      this.formColaborador.get('senha');

    const confirmarSenha =
      this.formColaborador.get('confirmarSenha');

    if (!senha || !confirmarSenha) {
      return;
    }

    if (
      senha.value &&
      confirmarSenha.value &&
      senha.value !== confirmarSenha.value
    ) {
      confirmarSenha.setErrors({
        ...(confirmarSenha.errors || {}),
        senhasDiferentes: true
      });
      return;
    }

    if (confirmarSenha.hasError('senhasDiferentes')) {
      const {
        senhasDiferentes,
        ...errosRestantes
      } = confirmarSenha.errors || {};

      confirmarSenha.setErrors(
        Object.keys(errosRestantes).length
          ? errosRestantes
          : null
      );
    }
  }

  private atualizarValidadoresSenha(): void {
    this.formColaborador
      .get('senha')
      ?.updateValueAndValidity();

    this.formColaborador
      .get('confirmarSenha')
      ?.updateValueAndValidity();
  }

  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
    this.modalTremendo = false;
    this.isLoading = false;
    this.colaboradorSelecionadoId = null;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.valoresOriginaisDoFormulario = null;

    this.formColaborador.reset({
      nomeCompleto: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      cpf: '',
      endereco: '',
      telefone: '',
      idPapel: this.somenteMonitores ? this.idPapelMonitor : null,
      idsUnidades: []
    });

    this.formColaborador.markAsPristine();
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;

    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

}
