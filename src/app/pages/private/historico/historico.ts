import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbasResponsivas } from 'src/app/shared/directives/abas-responsivas';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoricoDetalheComponent } from '@components/historico-detalhe/historico-detalhe';

import { BarraBusca } from '@components/barra-busca/barra-busca';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { Paginacao } from '@components/paginacao/paginacao';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';
import {
  AreaSistemaHistorico,
  AtividadeHistorico,
  ResponsavelHistorico,
  FiltrosHistorico,
  HistoricoEvento,
  TipoAlteracaoHistorico,
  TipoRegistroHistorico
} from 'src/app/shared/models/historico.model';
import { HistoricoService } from 'src/app/shared/services/historico/historico.service';
import { CampoOrdenacao, alternarOrdenacao, analisarOrdenacao, TAMANHOS_PAGINA_PERMITIDOS } from 'src/app/shared/utils/paginacao-url';
import { Alertas } from 'src/app/shared/utils/alerts';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [
    AbasResponsivas,
    FormsModule,
    OverlayModule,
    A11yModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    BarraBusca,
    ModalLayout,
    Paginacao,
    TabelaLayout,
    HistoricoDetalheComponent
  ],
  templateUrl: './historico.html',
  styleUrl: './historico.css'
})
export class Historico implements OnInit, OnDestroy {
  private readonly historicoService = inject(HistoricoService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private listaSub?: Subscription;
  private leituraSub?: Subscription;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private rotaSub?: Subscription;
  private responsaveisSub?: Subscription;
  private responsavelSelecionadoSub?: Subscription;
  private paginaResponsaveis = 0;
  private termoResponsaveis = '';
  temMaisResponsaveis = false;
  responsaveis: ResponsavelHistorico[] = [];
  erroResponsaveis = false;
  responsavelBusca: ResponsavelHistorico | string | null = null;
  responsaveisFiltrados: ResponsavelHistorico[] = [];
  buscandoResponsavel = false;
  private confirmandoSaidaFiltros = false;
  private readonly buscaResponsavel = new Subject<string>();
  private buscaResponsavelSub?: Subscription;
  areaAberta = false;
  readonly gruposExpandidos: Record<AreaSistemaHistorico, boolean> = {
    GESTAO_INTERNA: false,
    CONTEUDO_PUBLICO: false
  };
  sort: string | undefined;
  ordenacao: CampoOrdenacao | null = { campo: 'dataHora', direcao: 'desc' };
  periodo: 'RECENTES' | 'ARQUIVADOS' | 'TODOS' = 'RECENTES';
  contexto: FiltrosHistorico = {};
  atividades: AtividadeHistorico[] = [];
  registrosDetalhe: HistoricoEvento[] = [];
  todasAreas = true;
  grupoSelecionado: AreaSistemaHistorico | null = null;

  readonly tiposRegistro: { valor: TipoRegistroHistorico; nome: string; busca: string }[] = [
    { valor: 'COLABORADORES', nome: 'Colaboradores', busca: 'Buscar por nome, CPF, e-mail...' },
    { valor: 'USUARIOS', nome: 'Usuários', busca: 'Buscar por nome, CPF, endereço...' },
    { valor: 'CONTATOS', nome: 'Contatos', busca: 'Buscar por contato ou usuário vinculado...' },
    { valor: 'VINCULOS_CONTATOS', nome: 'Vínculos de contatos', busca: 'Buscar por contato ou usuário vinculado...' },
    { valor: 'PRESENCAS', nome: 'Presenças', busca: 'Buscar por usuário ou turma...' },
    { valor: 'OCORRENCIAS', nome: 'Ocorrências', busca: 'Buscar por usuário, tipo ou descrição...' },
    { valor: 'UNIDADES', nome: 'Unidades', busca: 'Buscar por unidade...' },
    { valor: 'TURMAS', nome: 'Turmas', busca: 'Buscar por período ou unidade...' },
    { valor: 'EVENTOS', nome: 'Eventos', busca: 'Buscar por título ou informação do evento...' },
    { valor: 'DIRETORIA', nome: 'Diretoria', busca: 'Buscar por nome ou cargo...' },
    { valor: 'PARCEIROS', nome: 'Parceiros', busca: 'Buscar por nome do parceiro...' },
    { valor: 'REDES_SOCIAIS', nome: 'Redes sociais', busca: 'Buscar por nome ou endereço do link...' },
    { valor: 'TRANSPARENCIA', nome: 'Transparência', busca: 'Buscar por seção ou documento...' },
    { valor: 'CONHECA_OSC', nome: 'Conheça a OSC', busca: 'Buscar por título ou conteúdo...' },
    { valor: 'GRAFICA', nome: 'Gráfica', busca: 'Buscar por produto, serviço ou contato...' },
    { valor: 'PIX', nome: 'Pix', busca: 'Buscar por informação da doação...' }
  ];

  readonly gruposAreas: { valor: AreaSistemaHistorico; nome: string; tipos: Historico['tiposRegistro'] }[] = [
    { valor: 'GESTAO_INTERNA', nome: 'Gestão interna', tipos: this.tiposRegistro.slice(0, 8) },
    { valor: 'CONTEUDO_PUBLICO', nome: 'Conteúdo público', tipos: this.tiposRegistro.slice(8) }
  ];

  readonly nomesAlteracao: Record<TipoAlteracaoHistorico, string> = {
    CADASTRO: 'Cadastro',
    EDICAO: 'Edição',
    EXCLUSAO: 'Exclusão'
  };

  readonly colunas: TabelaColuna<HistoricoEvento>[] = [
    { chave: 'dataHora', titulo: 'Data e hora', ordenavel: true, formatar: valor => this.formatarDataHora(valor) },
    { chave: 'informacaoAlterada', titulo: 'Tipo de registro' },
    {
      chave: 'identificacaoRegistro',
      titulo: 'Registro',
      ordenavel: true,
      principalMobile: true,
      formatar: (_, evento) => evento.identificacaoRegistro
    },
    {
      chave: 'nomeResponsavel',
      titulo: 'Responsável',
      ordenavel: true
    },
    {
      chave: 'tipoAlteracao',
      titulo: 'Ação',
      ordenavel: true,
      formatar: (_, evento) => this.formatarAcao(evento)
    }
  ];

  readonly acoes: TabelaAcao<HistoricoEvento>[] = [
    {
      acao: 'detalhes',
      icone: 'visibility',
      tooltip: 'Ver alterações',
      executar: evento => this.abrirDetalhes(evento.id)
    }
  ];

  tipoRegistro: TipoRegistroHistorico = 'COLABORADORES';
  busca = '';
  eventos: HistoricoEvento[] = [];
  pagina = 0;
  tamanho = 10;
  totalPaginas = 0;
  totalElementos = 0;
  carregandoLista = false;
  erroLista = false;

  filtros: FiltrosHistorico = {};
  filtrosModal: FiltrosHistorico = {};
  filtrosAberto = false;
  erroFiltros = '';

  detalhesAberto = false;

  formatarAcao(evento: HistoricoEvento): string {
    const atividade = this.atividades.find(item => item.evento.id === evento.id);
    const acoes = new Set((atividade?.registros ?? [evento]).map(registro => registro.tipoAlteracao));
    return Array.from(acoes).map(acao => this.nomesAlteracao[acao]).sort((a, b) => a.localeCompare(b, 'pt-BR')).join(' / ');
  }

  get orientacaoBusca(): string {
    if (this.todasAreas) return 'Buscar por responsável pela alteração, informação alterada...';
    return this.tiposRegistro.find(tipo => tipo.valor === this.tipoRegistro)?.busca ?? 'Buscar...';
  }

  get quantidadeFiltros(): number {
    return Object.values(this.filtros).filter(valor => valor != null && valor !== '').length
      + (this.temContexto ? 1 : 0);
  }

  get areaAtual(): TipoRegistroHistorico | AreaSistemaHistorico | 'TODOS' {
    return this.grupoSelecionado ?? (this.todasAreas ? 'TODOS' : this.tipoRegistro);
  }

  get mostrarDataAula(): boolean {
    return this.areaAtual === 'TODOS' || this.areaAtual === 'GESTAO_INTERNA' || this.areaAtual === 'PRESENCAS';
  }

  ngOnInit(): void {
    this.buscaResponsavelSub = this.buscaResponsavel.pipe(
      debounceTime(400)
    ).subscribe(termo => {
      this.carregarResponsaveis(termo);
      this.changeDetector.markForCheck();
    });
    this.rotaSub = this.route.queryParamMap.subscribe(parametros => {
      const area = parametros.get('tipoRegistro');
      this.todasAreas = !this.tiposRegistro.some(tipo => tipo.valor === area);
      const grupo = parametros.get('areaSistema');
      this.grupoSelecionado = this.todasAreas && this.gruposAreas.some(item => item.valor === grupo)
        ? grupo as AreaSistemaHistorico : null;
      if (this.tiposRegistro.some(tipo => tipo.valor === area)) {
        this.tipoRegistro = area as TipoRegistroHistorico;
      }
      const numero = (nome: string): number | null => {
        const valor = Number(parametros.get(nome));
        return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
      };
      this.contexto = { idRegistro: numero('idRegistro'), idUsuario: numero('idUsuario'),
        idTurma: numero('idTurma'), idContato: numero('idContato') };
      const periodo = parametros.get('periodo');
      this.periodo = periodo === 'ARQUIVADOS' || periodo === 'TODOS' ? periodo : 'RECENTES';
      this.filtros = {
        dataInicial: parametros.get('dataInicial') ?? '', dataFinal: parametros.get('dataFinal') ?? '',
        idResponsavel: numero('idResponsavel'), dataAula: parametros.get('dataAula') ?? '',
        tipoAlteracao: (parametros.get('tipoAlteracao') ?? '') as TipoAlteracaoHistorico | ''
      };
      this.busca = parametros.get('search') ?? '';
      this.pagina = Math.max(0, Number(parametros.get('page')) || 0);
      const tamanho = Number(parametros.get('size'));
      if (TAMANHOS_PAGINA_PERMITIDOS.includes(tamanho)) {
        this.tamanho = tamanho;
      }
      const sort = parametros.get('sort') ?? undefined;
      const ordenacao = analisarOrdenacao(sort);
      this.sort = ordenacao && this.colunas.some(coluna => coluna.chave === ordenacao.campo)
        ? `${ordenacao.campo},${ordenacao.direcao}` : undefined;
      this.ordenacao = analisarOrdenacao(this.sort) ?? { campo: 'dataHora', direcao: 'desc' };
      this.carregarEventos();
    });
  }

  carregarResponsaveis(termo = this.termoResponsaveis, pagina = 0): void {
    this.erroResponsaveis = false;
    this.buscandoResponsavel = true;
    this.termoResponsaveis = termo;
    this.responsaveisSub?.unsubscribe();
    this.responsaveisSub = this.historicoService.buscarResponsaveis(termo, pagina).subscribe({
      next: resposta => {
        this.responsaveisFiltrados = pagina === 0 ? resposta.content : [...this.responsaveisFiltrados, ...resposta.content];
        this.responsaveis = this.responsaveisFiltrados;
        this.paginaResponsaveis = resposta.page.number;
        this.temMaisResponsaveis = resposta.page.number + 1 < resposta.page.totalPages;
        this.buscandoResponsavel = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.erroResponsaveis = true;
        this.buscandoResponsavel = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  private atualizarConsulta(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {
      ...this.contexto, ...this.filtros, tipoRegistro: this.todasAreas ? 'TODOS' : this.tipoRegistro,
      areaSistema: this.grupoSelecionado,
      periodo: this.periodo, search: this.busca || null, page: this.pagina || null, size: this.tamanho, sort: this.sort ?? null
    }});
  }

  trocarPeriodo(periodo: 'RECENTES' | 'ARQUIVADOS' | 'TODOS'): void {
    this.periodo = periodo;
    this.pagina = 0;
    this.atualizarConsulta();
  }

  get temContexto(): boolean {
    return Object.values(this.contexto).some(valor => valor != null);
  }

  ngOnDestroy(): void {
    this.listaSub?.unsubscribe();
    this.rotaSub?.unsubscribe();
    this.responsaveisSub?.unsubscribe();
    this.responsavelSelecionadoSub?.unsubscribe();
    this.buscaResponsavelSub?.unsubscribe();
    this.leituraSub?.unsubscribe();
  }

  carregarEventos(): void {
    this.listaSub?.unsubscribe();
    this.carregandoLista = true;
    this.erroLista = false;

    this.listaSub = this.historicoService.atividades(
      this.todasAreas ? null : this.tipoRegistro, this.pagina, this.tamanho, this.busca,
      { ...this.contexto, ...this.filtros, areaSistema: this.grupoSelecionado, periodo: this.periodo }, this.sort
    ).subscribe({
      next: resposta => {
        this.erroLista = false;
        this.atividades = resposta.content;
        this.eventos = resposta.content.map(atividade => atividade.evento);
        this.totalPaginas = resposta.page.totalPages;
        this.totalElementos = resposta.page.totalElements;
        this.carregandoLista = false;
        this.registrarLeitura();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.erroLista = true;
        this.carregandoLista = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  private registrarLeitura(): void {
    // Uma busca ou filtro parcial não significa que o restante do histórico foi visto.
    if (this.busca.trim() || this.filtros.idResponsavel || this.filtros.dataInicial
        || this.filtros.dataFinal || this.filtros.tipoAlteracao || !this.atividades.length) return;
    const ultimoEvento = Math.max(...this.atividades.flatMap(atividade =>
      atividade.registros.map(evento => evento.id)));
    if (!Number.isSafeInteger(ultimoEvento) || ultimoEvento <= 0) return;
    const filtros: FiltrosHistorico = {
      ...this.contexto, dataAula: this.filtros.dataAula, areaSistema: this.grupoSelecionado,
      periodo: this.periodo === 'ARQUIVADOS' ? 'ARQUIVADOS' : 'TODOS'
    };
    this.leituraSub?.unsubscribe();
    this.leituraSub = this.historicoService.marcarLido(
      this.todasAreas ? null : this.tipoRegistro, filtros, ultimoEvento
    ).subscribe({ error: () => {} });
  }

  trocarTipo(tipo: TipoRegistroHistorico | 'TODOS'): void {
    this.selecionarArea(tipo);
  }

  trocarGrupo(grupo: AreaSistemaHistorico): void {
    this.selecionarArea(grupo);
  }

  private selecionarArea(area: TipoRegistroHistorico | AreaSistemaHistorico | 'TODOS'): void {
    this.areaAberta = false;
    if (area === this.areaAtual) return;

    this.grupoSelecionado = this.gruposAreas.find(grupo => grupo.valor === area)?.valor ?? null;
    this.todasAreas = area === 'TODOS' || this.grupoSelecionado !== null;
    if (!this.todasAreas) this.tipoRegistro = area as TipoRegistroHistorico;
    this.contexto = {};
    if (!this.mostrarDataAula) this.filtros.dataAula = '';
    this.pagina = 0;
    this.atualizarConsulta();
  }

  buscar(termo: string): void {
    this.busca = termo;
    this.pagina = 0;
    this.atualizarConsulta();
  }

  irParaPagina(pagina: number): void {
    this.pagina = pagina;
    this.atualizarConsulta();
  }

  mudarTamanho(tamanho: number): void {
    this.tamanho = tamanho;
    this.pagina = 0;
    this.atualizarConsulta();
  }

  get nomeAreaSelecionada(): string {
    return this.gruposAreas.find(grupo => grupo.valor === this.areaAtual)?.nome
      ?? this.tiposRegistro.find(tipo => tipo.valor === this.areaAtual)?.nome
      ?? 'Todas as áreas';
  }

  ordenarPor(campo: string): void {
    if (!this.colunas.some(coluna => coluna.chave === campo)) return;
    this.sort = alternarOrdenacao(this.ordenacao, campo);
    this.ordenacao = analisarOrdenacao(this.sort);
    this.pagina = 0;
    this.atualizarConsulta();
  }

  exibirResponsavel(valor: ResponsavelHistorico | string | null): string {
    return typeof valor === 'string' ? valor : valor?.nome ?? '';
  }

  alterarBuscaResponsavel(valor: ResponsavelHistorico | string | null): void {
    this.responsaveisSub?.unsubscribe();
    this.responsavelBusca = valor;
    this.filtrosModal.idResponsavel = valor && typeof valor !== 'string' ? valor.id : null;
    this.responsaveisFiltrados = [];
    this.erroFiltros = '';
    this.temMaisResponsaveis = false;
    this.buscandoResponsavel = true;
    this.buscaResponsavel.next(typeof valor === 'string' ? valor : '');
  }

  mostrarResponsaveis(): void {
    this.carregarResponsaveis(typeof this.responsavelBusca === 'string' ? this.responsavelBusca : '');
  }

  carregarMaisResponsaveis(): void {
    if (this.buscandoResponsavel || !this.temMaisResponsaveis) return;
    this.carregarResponsaveis(this.termoResponsaveis, this.paginaResponsaveis + 1);
  }

  private get filtrosModalAlterados(): boolean {
    const campos: (keyof FiltrosHistorico)[] = [
      'idResponsavel', 'dataInicial', 'dataFinal', 'dataAula', 'tipoAlteracao'
    ];
    return (typeof this.responsavelBusca === 'string' && this.responsavelBusca.trim() !== '')
      || campos.some(campo => (this.filtrosModal[campo] ?? '') !== (this.filtros[campo] ?? ''));
  }

  async fecharFiltros(): Promise<void> {
    if (!this.filtrosAberto || this.confirmandoSaidaFiltros) return;
    this.confirmandoSaidaFiltros = true;
    try {
      if (this.filtrosModalAlterados && await Alertas.confirmarSaidaFiltros() === 'voltar') return;
      this.filtrosAberto = false;
      this.areaAberta = false;
    } finally {
      this.confirmandoSaidaFiltros = false;
      this.changeDetector.markForCheck();
    }
  }

  private restaurarResponsavel(): void {
    if (this.filtrosModal.idResponsavel) {
      this.responsavelBusca = this.responsaveis.find(item => item.id === this.filtrosModal.idResponsavel) ?? null;
      if (!this.responsavelBusca) {
        const id = this.filtrosModal.idResponsavel;
        this.responsavelSelecionadoSub?.unsubscribe();
        this.responsavelSelecionadoSub = this.historicoService.buscarResponsaveis('', 0, id).subscribe({
          next: resposta => {
            if (this.filtrosModal.idResponsavel !== id || this.responsavelBusca) return;
            this.responsavelBusca = resposta.content[0] ?? null;
            this.changeDetector.markForCheck();
          },
          error: () => {
            this.erroResponsaveis = true;
            this.changeDetector.markForCheck();
          }
        });
      }
    }
  }

  abrirFiltros(): void {
    this.areaAberta = false;
    this.filtrosModal = { ...this.filtros };
    this.responsavelBusca = null;
    this.buscandoResponsavel = false;
    this.restaurarResponsavel();
    this.carregarResponsaveis('');
    this.buscaResponsavel.next('');
    this.erroFiltros = '';
    this.filtrosAberto = true;
  }

  aplicarFiltros(formulario: NgForm): void {
    if (formulario.invalid) {
      formulario.control.markAllAsTouched();
      return;
    }

    if (typeof this.responsavelBusca === 'string' && this.responsavelBusca.trim()) {
      this.erroFiltros = 'Selecione um responsável na lista ou limpe o campo para consultar todos.';
      return;
    }
    const { dataInicial, dataFinal } = this.filtrosModal;
    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      this.erroFiltros = 'A data final não pode ser anterior à data inicial.';
      return;
    }

    this.filtros = { ...this.filtrosModal };
    if (!this.mostrarDataAula) this.filtros.dataAula = '';
    this.areaAberta = false;
    this.filtrosAberto = false;
    this.pagina = 0;
    this.atualizarConsulta();
  }

  limparFiltros(): void {
    this.areaAberta = false;
    this.contexto = {};
    this.responsavelBusca = null;
    this.responsaveisFiltrados = [];
    this.buscandoResponsavel = false;
    this.buscaResponsavel.next('');
    this.erroFiltros = '';
    this.filtros = {};
    this.filtrosModal = {};
    this.filtrosAberto = false;
    this.pagina = 0;
    this.atualizarConsulta();
  }

  abrirDetalhes(id: number): void {
    this.registrosDetalhe = this.atividades.find(atividade => atividade.evento.id === id)?.registros ?? [];
    this.detalhesAberto = true;
  }

  fecharDetalhes(): void {
    this.detalhesAberto = false;
    this.registrosDetalhe = [];
  }

  formatarDataHora(valor: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(valor)).replace(', ', ' às ');
  }


  abrirCalendario(campo: HTMLInputElement): void {
    campo.focus();
    if (typeof campo.showPicker === 'function') campo.showPicker();
  }

}
