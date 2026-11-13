import { HistoricoContextual } from '@components/historico-contextual/historico-contextual';
import {
  ChangeDetectorRef,
  Component,
  inject,
  HostListener,
  NgZone,
  OnDestroy,
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

import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { ToastrService } from 'ngx-toastr';

import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaAcao,
  TabelaColuna,
  TabelaLayout
} from '@components/tabela-layout/tabela-layout';

import { Paginacao } from '@components/paginacao/paginacao';
import { BarraBusca } from '@components/barra-busca/barra-busca';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import {
  AtualizarColaboradorDTO,
  Colaborador,
  CriarColaboradorDTO,
  ReativarColaboradorDTO,
  SituacaoColaborador
} from 'src/app/shared/models/colaborador.model';
import { Auth } from 'src/app/shared/services/auth/auth';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
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
    HistoricoContextual,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    Paginacao,
    BarraBusca,
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

  private readonly sessao = inject(SessaoService);

  colaboradores: Colaborador[] = [];
  papeisDisponiveis: string[] = [];
  papeis: Papel[] = [];

  // Filtro por papel agora é feito no back-end (idPapel), não em memória.
  filtroPapel: number | null = null;
  filtroUnidade: number | null = null;
  filtroModalPapel: number | null = null;
  filtroModalUnidade: number | null = null;
  /** Situação do cadastro; a lista começa com ativos e inativos. */
  filtroSituacao: SituacaoColaborador = 'todos';
  filtroModalSituacao: SituacaoColaborador = 'todos';
  filtrosAberto = false;

  /** Termo da barra de busca, espelhado em ?search= na URL. */
  busca = '';

  unidadesDisponiveis: Unidade[] = [];

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
  colaboradorPreview: Colaborador | null = null;
  modoEdicao = false;
  /** Formulário aberto para reativar um colaborador inativo (dados revisados + nova senha). */
  modoReativacao = false;
  /** Evita solicitações duplicadas de desativação/reativação. */
  private situacaoEmProcessamento = false;
  colaboradorSelecionadoId: number | null = null;
  colaboradorEmEdicao: Colaborador | null = null;
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
      formatar: valor => this.formatarCpfExibicao(valor),
      ordenavel: true
    },
    {
      chave: 'nomePapel',
      titulo: 'Papel',
      formatar: (valor) => this.formatarTextoExibicao(String(valor || '')),
      ordenavel: true,
      campoOrdenacao: 'papel.nomePapel'
    },
    {
      chave: 'ativo',
      titulo: 'Situação',
      tipo: 'status'
    }
  ];

  acoesTabela: TabelaAcao<Colaborador>[] = [
    {
      icone: 'visibility',
      tooltip: 'Visualizar',
      acao: 'visualizar'
    },
    {
      icone: 'account_circle',
      tooltip: 'Meu perfil',
      acao: 'meu-perfil',
      visivel: colaborador => this.ehPropriaConta(colaborador)
    },
    {
      icone: 'edit',
      tooltip: 'Editar',
      acao: 'editar',
      visivel: colaborador => this.podeGerenciarColaborador(colaborador)
    },
    {
      icone: 'person_off',
      tooltip: 'Desativar acesso',
      rotulo: 'Desativar acesso',
      acao: 'desativar',
      menu: true,
      perigosa: true,
      visivel: colaborador => colaborador.ativo !== false && this.podeGerenciarColaborador(colaborador)
    },
    {
      icone: 'person_check',
      tooltip: 'Reativar acesso',
      rotulo: 'Reativar acesso',
      acao: 'reativar',
      menu: true,
      visivel: colaborador => colaborador.ativo === false && this.podeGerenciarColaborador(colaborador)
    },
    {
      icone: 'delete',
      tooltip: 'Excluir cadastro',
      rotulo: 'Excluir cadastro',
      acao: 'excluir',
      menu: true,
      perigosa: true,
      visivel: colaborador => this.podeGerenciarColaborador(colaborador)
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

      const unidadeBruta = Number(params.get('unidade') ?? params.get('idUnidade'));
      this.filtroUnidade = Number.isFinite(unidadeBruta) && unidadeBruta > 0
        ? unidadeBruta
        : null;

      this.busca = params.get('search') ?? '';

      const situacao = params.get('situacao');
      this.filtroSituacao = situacao === 'inativos' || situacao === 'ativos' ? situacao : 'todos';

      this.carregarColaboradores();
    });

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
    this.papelSub?.unsubscribe();
    this.listaSub?.unsubscribe();
  }

  get mensagemVazia(): string {
    if (this.busca) {
      return `Nenhum colaborador encontrado para "${this.busca}".`;
    }
    if (this.filtroSituacao === 'inativos' && !this.filtroPapel && !this.filtroUnidade) {
      return 'Nenhum colaborador inativo.';
    }
    const papelSelecionado = this.papeis.find(p => p.id === this.filtroPapel);
    const unidadeSelecionada = this.unidadesDisponiveis.find(u => u.id === this.filtroUnidade);

    if (papelSelecionado || unidadeSelecionada || this.filtroSituacao !== 'todos') {
      return 'Nenhum colaborador encontrado com os filtros selecionados.';
    }

    return 'Nenhum colaborador cadastrado.';
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao && !this.modoReativacao) {
      return this.formColaborador.dirty;
    }

    const normalizar = (valores: any) => ({
      ...valores,
      idsUnidades: [...(valores?.idsUnidades || [])].sort((a, b) => a - b)
    });
    return JSON.stringify(normalizar(this.formColaborador.getRawValue())) !==
      JSON.stringify(normalizar(this.valoresOriginaisDoFormulario));
  }

  /** Coordenador só faz a gestão de monitores; administrador vê e gerencia todos os papéis. */
  get somenteMonitores(): boolean {
    return this.auth.hasRole('COORDENADOR');
  }

  ehPropriaConta(colaborador: Colaborador): boolean {
    return colaborador.id === this.sessao.membro()?.id;
  }

  podeGerenciarColaborador(colaborador: Colaborador): boolean {
    if (!this.sessao.membro() || this.ehPropriaConta(colaborador)) return false;
    if (this.auth.hasRole('ADMINISTRADOR')) return true;
    const membro = this.sessao.membro();
    if (!this.somenteMonitores || membro?.nomePapel !== 'COORDENADOR' || colaborador.nomePapel !== 'MONITOR') return false;
    const unidades = colaborador.unidades ?? [];
    const permitidas = new Set((membro.unidades ?? []).map(unidade => unidade.id));
    return unidades.length > 0 && unidades.every(unidade => permitidas.has(unidade.id));
  }

  get quantidadeFiltrosAplicados(): number {
    return Number(Boolean(this.filtroUnidade)) +
      Number(Boolean(!this.somenteMonitores && this.filtroPapel)) +
      Number(this.filtroSituacao !== 'todos');
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
    forkJoin({
      unidades: this.unidadeService.listarTodos(),
      membro: this.sessao.carregar()
    })
      .subscribe({
        next: ({ unidades, membro }) => {
          const permitidas = new Set((membro?.unidades ?? []).map(unidade => unidade.id));
          this.unidadesDisponiveis = this.somenteMonitores
            ? unidades.filter(unidade => permitidas.has(unidade.id))
            : unidades;
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
    // Uma nova busca/filtro cancela a requisição anterior em andamento: vale sempre a mais recente.
    this.listaSub?.unsubscribe();

    this.carregandoLista = true;
    this.erroLista = false;

    const idPapel = this.somenteMonitores ? undefined : this.filtroPapel ?? undefined;

    this.listaSub = this.colaboradorService
      .listarTodos(
        this.pagina,
        this.tamanho,
        this.sort,
        idPapel,
        this.filtroUnidade,
        this.busca || undefined,
        this.filtroSituacao === 'todos' ? null : this.filtroSituacao === 'ativos'
      )
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

  abrirFiltros(): void {
    this.filtroModalUnidade = this.filtroUnidade;
    this.filtroModalPapel = this.filtroPapel;
    this.filtroModalSituacao = this.filtroSituacao;
    this.filtrosAberto = true;
  }

  async fecharFiltros(confirmarDescarte = true): Promise<void> {
    if (confirmarDescarte && this.filtrosModalAlterados()) {
      const acao = await Alertas.confirmarSaidaFiltros();

      if (acao === 'voltar') {
        return;
      }
    }

    this.filtrosAberto = false;
  }

  aplicarFiltrosModal(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        unidade: this.filtroModalUnidade || null,
        papel: this.somenteMonitores ? null : this.filtroModalPapel || null,
        situacao: this.filtroModalSituacao === 'todos' ? null : this.filtroModalSituacao,
        page: 0
      },
      queryParamsHandling: 'merge'
    });
    this.fecharFiltros(false);
  }

  limparFiltros(): void {
    this.filtroModalUnidade = null;
    this.filtroModalPapel = null;
    this.filtroModalSituacao = 'todos';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { unidade: null, papel: null, situacao: null, page: 0 },
      queryParamsHandling: 'merge'
    });
  }

  selecionarUnidadeFiltro(valor: number | string | null): void {
    this.filtroModalUnidade = valor === 'todas' || valor === null
      ? null
      : Number(valor);
  }

  selecionarPapelFiltro(valor: number | string | null): void {
    this.filtroModalPapel = valor === 'todos' || valor === null
      ? null
      : Number(valor);
  }

  selecionarSituacaoFiltro(valor: SituacaoColaborador): void {
    this.filtroModalSituacao = valor;
  }

  private filtrosModalAlterados(): boolean {
    return this.filtroModalUnidade !== this.filtroUnidade ||
      this.filtroModalPapel !== this.filtroPapel ||
      this.filtroModalSituacao !== this.filtroSituacao;
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
    this.colaboradorEmEdicao = null;
    this.modoEdicao = false;
    this.modoReativacao = false;
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
    if (!this.podeGerenciarColaborador(colaborador)) return;
    this.colaboradorEmEdicao = colaborador;
    this.modoEdicao = true;
    this.modoReativacao = false;
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

  /** Abre o mesmo formulário do cadastro, preenchido, para reativar o colaborador com nova senha. */
  abrirReativacao(colaborador: Colaborador): void {
    if (!this.podeGerenciarColaborador(colaborador) || colaborador.ativo !== false) return;
    this.colaboradorEmEdicao = colaborador;
    this.modoEdicao = false;
    this.modoReativacao = true;
    this.colaboradorSelecionadoId = colaborador.id;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;
    this.modalTremendo = false;

    this.formColaborador.get('senha')?.setValidators([
      Validators.required,
      Validators.pattern(this.senhaRegex),
      Validators.maxLength(50)
    ]);
    this.formColaborador.get('confirmarSenha')?.setValidators([Validators.required]);

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
    this.valoresOriginaisDoFormulario = this.formColaborador.getRawValue();
    this.modalAberto = true;
    this.cdr.detectChanges();
  }

  fecharModal(): void {
    if (!this.modoReativacao && !this.formularioTemAlteracoesNaoSalvas()) {
      this.fecharModalSemConfirmacao();
      return;
    }

    Alertas
      .confirmarDescarte(this.modoReativacao
        ? 'Deseja descartar a reativação deste colaborador? O cadastro continuará inativo.'
        : undefined)
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

  formatarCpfExibicao(valor: string | null | undefined): string {
    return formatarCpf(valor) || '-';
  }

  formatarTelefoneExibicao(valor: string | null | undefined): string {
    return formatarTelefone(valor) || '-';
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
    if (this.isLoading) return;
    if ((this.modoEdicao || this.modoReativacao)
      && (!this.colaboradorEmEdicao || !this.podeGerenciarColaborador(this.colaboradorEmEdicao))) return;
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

    if (this.modoReativacao) {
      this.reativarColaborador();
      return;
    }

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
    if (evento.tipo === 'meu-perfil' && this.ehPropriaConta(evento.linha)) {
      void this.router.navigate(['/dashboard/perfil']);
      return;
    }

    if (evento.tipo === 'visualizar') {
      this.colaboradorPreview = evento.linha;
      return;
    }

    if (evento.tipo === 'editar') {
      this.abrirEdicao(evento.linha);
      return;
    }

    if (evento.tipo === 'desativar') {
      void this.desativarColaborador(evento.linha);
      return;
    }

    if (evento.tipo === 'reativar') {
      void this.iniciarReativacao(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir') {
      this.deletarColaborador(evento.linha);
    }
  }

  async desativarColaborador(colaborador: Colaborador): Promise<void> {
    if (this.situacaoEmProcessamento || colaborador.ativo === false
      || !this.podeGerenciarColaborador(colaborador)) return;

    this.situacaoEmProcessamento = true;
    try {
      const confirmado = await Alertas.confirmarDesativacaoColaborador(colaborador.nomeCompleto);
      if (!confirmado || !this.podeGerenciarColaborador(colaborador)) {
        this.situacaoEmProcessamento = false;
        return;
      }
    } catch (erro) {
      this.situacaoEmProcessamento = false;
      throw erro;
    }

    this.isLoading = true;
    this.colaboradorService.desativar(colaborador.id).subscribe({
      next: () => this.ngZone.run(() => {
        this.isLoading = false;
        this.situacaoEmProcessamento = false;
        this.carregarColaboradores();
        this.toastr.success(`O acesso de ${colaborador.nomeCompleto} foi desativado.`, 'Sucesso');
      }),
      error: (erro) => this.ngZone.run(() => {
        this.isLoading = false;
        this.situacaoEmProcessamento = false;
        const mensagem = erro.error?.message
          || 'Não foi possível desativar o acesso. Tente novamente.';
        if (erro.status === 409) {
          this.toastr.warning(mensagem, 'Desativação não permitida');
          this.carregarColaboradores();
        } else if (erro.status !== 401) {
          this.toastr.error(mensagem, 'Erro');
        }
        this.cdr.detectChanges();
      })
    });
  }

  private async iniciarReativacao(colaborador: Colaborador): Promise<void> {
    if (this.situacaoEmProcessamento || colaborador.ativo !== false
      || !this.podeGerenciarColaborador(colaborador)) return;

    this.situacaoEmProcessamento = true;
    try {
      const confirmado = await Alertas.confirmarReativacaoColaborador(colaborador.nomeCompleto);
      if (confirmado) {
        this.ngZone.run(() => this.abrirReativacao(colaborador));
      }
    } finally {
      this.situacaoEmProcessamento = false;
    }
  }

  deletarColaborador(
    colaborador: Colaborador
  ): void {
    if (!this.podeGerenciarColaborador(colaborador)) return;
    Alertas
      .confirmarExclusao()
      .then((confirmado: boolean) => {
        if (!confirmado || !this.podeGerenciarColaborador(colaborador)) {
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
            error: (erro) => {
              this.isLoading = false;
              const mensagem = erro.error?.message || (erro.status === 409
                ? 'Não é possível excluir este colaborador porque existem registros vinculados a ele.'
                : 'Não foi possível excluir o colaborador. Tente novamente.');
              if (erro.status === 409) this.toastr.warning(mensagem, 'Exclusão não permitida');
              else this.toastr.error(mensagem, 'Erro');
              this.cdr.detectChanges();
            }
          });
      });
  }

  obterNomePapel(papel: Papel): string {
    return this.formatarTextoExibicao(papel.nomePapel || papel.nome || '');
  }

  formatarTextoExibicao(valor: string | null | undefined): string {
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

  private reativarColaborador(): void {
    const { senha, confirmarSenha, ...dadosRevisados } = this.formColaborador.value;
    const dto: ReativarColaboradorDTO = { ...dadosRevisados, senha, confirmacaoSenha: confirmarSenha };

    this.colaboradorService
      .reativar(this.colaboradorSelecionadoId!, dto)
      .subscribe({
        next: () => this.ngZone.run(() => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarColaboradores();
          this.toastr.success(
            'Colaborador reativado. Ele já pode entrar com as credenciais atualizadas.',
            'Sucesso'
          );
        }),
        error: (err: any) => this.ngZone.run(() => {
          // O formulário continua aberto e o colaborador segue inativo até salvar com sucesso.
          this.isLoading = false;
          if (err.status !== 401) {
            this.toastr.error(
              err.error?.message || 'Não foi possível reativar o colaborador. Tente novamente.',
              'Erro'
            );
          }
          this.cdr.detectChanges();
        })
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
    this.colaboradorEmEdicao = null;
    this.modoReativacao = false;
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
