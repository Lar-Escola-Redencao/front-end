import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbasResponsivas } from 'src/app/shared/directives/abas-responsivas';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoricoDetalheComponent } from '@components/historico-detalhe/historico-detalhe';

import { BarraBusca } from '@components/barra-busca/barra-busca';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { Paginacao } from '@components/paginacao/paginacao';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';
import {
  AtividadeHistorico,
  ResponsavelHistorico,
  FiltrosHistorico,
  HistoricoEvento,
  TipoAlteracaoHistorico,
  TipoRegistroHistorico
} from 'src/app/shared/models/historico.model';
import { HistoricoService } from 'src/app/shared/services/historico/historico.service';
import { TAMANHOS_PAGINA_PERMITIDOS } from 'src/app/shared/utils/paginacao-url';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [
    AbasResponsivas,
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private rotaSub?: Subscription;
  private responsaveisSub?: Subscription;
  responsaveis: ResponsavelHistorico[] = [];
  erroResponsaveis = false;
  periodo: 'RECENTES' | 'ARQUIVADOS' | 'TODOS' = 'RECENTES';
  contexto: FiltrosHistorico = {};
  atividades: AtividadeHistorico[] = [];
  registrosDetalhe: HistoricoEvento[] = [];
  todasAreas = true;

  readonly tiposRegistro: { valor: TipoRegistroHistorico; nome: string; busca: string }[] = [
    { valor: 'COLABORADORES', nome: 'Colaboradores', busca: 'Buscar por nome, CPF, e-mail...' },
    { valor: 'USUARIOS', nome: 'Usuários', busca: 'Buscar por nome, CPF, endereço...' },
    { valor: 'CONTATOS', nome: 'Contatos', busca: 'Buscar por contato ou usuário vinculado...' },
    { valor: 'VINCULOS_CONTATOS', nome: 'Vínculos de contatos', busca: 'Buscar por contato ou usuário vinculado...' },
    { valor: 'PRESENCAS', nome: 'Presenças', busca: 'Buscar por usuário ou turma...' },
    { valor: 'OCORRENCIAS', nome: 'Ocorrências', busca: 'Buscar por usuário, tipo ou descrição...' },
    { valor: 'UNIDADES', nome: 'Unidades', busca: 'Buscar por unidade...' },
    { valor: 'TURMAS', nome: 'Turmas', busca: 'Buscar por período ou unidade...' }
  ];

  readonly gruposAreas = [
    { nome: 'Gestão interna', tipos: this.tiposRegistro }
  ];

  readonly nomesAlteracao: Record<TipoAlteracaoHistorico, string> = {
    CADASTRO: 'Cadastro',
    EDICAO: 'Edição',
    EXCLUSAO: 'Exclusão'
  };

  readonly colunas: TabelaColuna<HistoricoEvento>[] = [
    { chave: 'dataHora', titulo: 'Data e hora', formatar: valor => this.formatarDataHora(valor) },
    {
      chave: 'identificacaoRegistro',
      titulo: 'Registro',
      principalMobile: true,
      formatar: (_, evento) => evento.identificacaoRegistro,
      etiqueta: evento => evento.registroExcluido ? 'Excluído' : null
    },
    {
      chave: 'nomeResponsavel',
      titulo: 'Responsável'
    },
    {
      chave: 'tipoAlteracao',
      titulo: 'Ação',
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
    return Array.from(acoes).map(acao => this.nomesAlteracao[acao]).join(' / ');
  }

  get orientacaoBusca(): string {
    if (this.todasAreas) return 'Buscar por pessoa, turma ou informação alterada...';
    return this.tiposRegistro.find(tipo => tipo.valor === this.tipoRegistro)?.busca ?? 'Buscar...';
  }

  get quantidadeFiltros(): number {
    return Object.values(this.filtros).filter(valor => valor != null && valor !== '').length;
  }

  ngOnInit(): void {
    this.carregarResponsaveis();
    this.rotaSub = this.route.queryParamMap.subscribe(parametros => {
      const area = parametros.get('tipoRegistro');
      this.todasAreas = !this.tiposRegistro.some(tipo => tipo.valor === area);
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
      this.carregarEventos();
    });
  }

  carregarResponsaveis(): void {
    this.erroResponsaveis = false;
    this.responsaveisSub?.unsubscribe();
    this.responsaveisSub = this.historicoService.responsaveis().subscribe({
      next: responsaveis => {
        this.responsaveis = responsaveis;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.erroResponsaveis = true;
        this.changeDetector.markForCheck();
      }
    });
  }

  private atualizarConsulta(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {
      ...this.contexto, ...this.filtros, tipoRegistro: this.todasAreas ? 'TODOS' : this.tipoRegistro,
      periodo: this.periodo, search: this.busca || null, page: this.pagina || null, size: this.tamanho
    }});
  }

  trocarPeriodo(periodo: 'RECENTES' | 'ARQUIVADOS' | 'TODOS'): void {
    this.periodo = periodo;
    this.pagina = 0;
    this.atualizarConsulta();
  }

  removerContexto(): void {
    this.contexto = {};
    this.filtros.dataAula = '';
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
  }

  carregarEventos(): void {
    this.listaSub?.unsubscribe();
    this.carregandoLista = true;
    this.erroLista = false;

    this.listaSub = this.historicoService.atividades(
      this.todasAreas ? null : this.tipoRegistro, this.pagina, this.tamanho, this.busca,
      { ...this.contexto, ...this.filtros, periodo: this.periodo }
    ).subscribe({
      next: resposta => {
        this.erroLista = false;
        this.atividades = resposta.content;
        this.eventos = resposta.content.map(atividade => atividade.evento);
        this.totalPaginas = resposta.page.totalPages;
        this.totalElementos = resposta.page.totalElements;
        this.carregandoLista = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.erroLista = true;
        this.carregandoLista = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  trocarTipo(tipo: TipoRegistroHistorico | 'TODOS'): void {
    this.todasAreas = tipo === 'TODOS';
    if (tipo !== 'TODOS') this.tipoRegistro = tipo;
    if (tipo !== 'PRESENCAS' && tipo !== 'TODOS') this.filtros.dataAula = '';
    this.contexto.idRegistro = null;
    this.filtrosModal = {};
    this.pagina = 0;
    this.eventos = [];
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

  abrirFiltros(): void {
    this.filtrosModal = { ...this.filtros };
    this.erroFiltros = '';
    this.filtrosAberto = true;
  }

  aplicarFiltros(formulario: NgForm): void {
    if (formulario.invalid) {
      formulario.control.markAllAsTouched();
      return;
    }

    const { dataInicial, dataFinal } = this.filtrosModal;
    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      this.erroFiltros = 'A data final não pode ser anterior à data inicial.';
      return;
    }

    this.filtros = { ...this.filtrosModal };
    this.filtrosAberto = false;
    this.pagina = 0;
    this.atualizarConsulta();
  }

  limparFiltros(): void {
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

}
