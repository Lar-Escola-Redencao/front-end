import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';

import { BarraBusca } from '@components/barra-busca/barra-busca';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { Paginacao } from '@components/paginacao/paginacao';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';
import {
  CampoHistorico,
  FiltrosHistorico,
  HistoricoDetalhe,
  HistoricoEvento,
  TipoAlteracaoHistorico,
  TipoRegistroHistorico,
  ValorHistorico
} from 'src/app/shared/models/historico.model';
import { HistoricoService } from 'src/app/shared/services/historico/historico.service';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    BarraBusca,
    ModalLayout,
    Paginacao,
    TabelaLayout
  ],
  templateUrl: './historico.html',
  styleUrl: './historico.css'
})
export class Historico implements OnInit, OnDestroy {
  private readonly historicoService = inject(HistoricoService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private listaSub?: Subscription;
  private detalheSub?: Subscription;

  readonly tiposRegistro: { valor: TipoRegistroHistorico; nome: string; busca: string }[] = [
    { valor: 'COLABORADORES', nome: 'Colaboradores', busca: 'Buscar por nome, CPF, e-mail...' },
    { valor: 'USUARIOS', nome: 'Usuários', busca: 'Buscar por nome, CPF, endereço...' },
    { valor: 'CONTATOS', nome: 'Contatos', busca: 'Buscar por contato ou usuário vinculado...' },
    { valor: 'VINCULOS_CONTATOS', nome: 'Vínculos de contatos', busca: 'Buscar por contato ou usuário vinculado...' },
    { valor: 'PRESENCAS', nome: 'Presenças', busca: 'Buscar por usuário ou turma...' },
    { valor: 'OCORRENCIAS', nome: 'Ocorrências', busca: 'Buscar por usuário, tipo ou descrição...' }
  ];

  readonly nomesAlteracao: Record<TipoAlteracaoHistorico, string> = {
    CADASTRO: 'Cadastro',
    EDICAO: 'Edição',
    EXCLUSAO: 'Exclusão'
  };

  readonly colunas: TabelaColuna<HistoricoEvento>[] = [
    { chave: 'dataHora', titulo: 'Data e hora', formatar: valor => this.formatarDataHora(valor) },
    {
      chave: 'nomeResponsavel',
      titulo: 'Responsável',
      formatar: (_, evento) => this.identificarResponsavel(evento)
    },
    {
      chave: 'identificacaoRegistro',
      titulo: 'Registro afetado',
      principalMobile: true,
      formatar: (_, evento) => `${evento.identificacaoRegistro} — ${evento.informacaoAlterada}`,
      etiqueta: evento => evento.registroExcluido ? 'Excluído' : null
    },
    {
      chave: 'tipoAlteracao',
      titulo: 'Tipo de alteração',
      formatar: (_, evento) => this.nomesAlteracao[evento.tipoAlteracao]
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
  carregandoDetalhe = false;
  erroDetalhe = false;
  detalhe: HistoricoDetalhe | null = null;
  private idDetalhe: number | null = null;

  get orientacaoBusca(): string {
    return this.tiposRegistro.find(tipo => tipo.valor === this.tipoRegistro)?.busca ?? 'Buscar...';
  }

  get quantidadeFiltros(): number {
    return Object.values(this.filtros).filter(valor => valor !== null && valor !== '').length;
  }

  get camposDetalhe(): CampoHistorico[] {
    const campos = this.detalhe?.campos ?? [];
    return this.detalhe?.evento.tipoRegistro === 'PRESENCAS'
      ? campos.filter(campo => campo.campo !== 'id')
      : campos;
  }

  get autorOriginal(): ValorHistorico {
    return this.detalhe?.contextoNovo['autorOriginal']
      ?? this.detalhe?.contextoAnterior['autorOriginal']
      ?? null;
  }

  ngOnInit(): void {
    this.carregarEventos();
  }

  ngOnDestroy(): void {
    this.listaSub?.unsubscribe();
    this.detalheSub?.unsubscribe();
  }

  carregarEventos(): void {
    this.listaSub?.unsubscribe();
    this.carregandoLista = true;
    this.erroLista = false;

    this.listaSub = this.historicoService.listar(
      this.tipoRegistro, this.pagina, this.tamanho, this.busca, this.filtros
    ).subscribe({
      next: resposta => {
        this.eventos = resposta.content;
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

  trocarTipo(tipo: TipoRegistroHistorico): void {
    this.tipoRegistro = tipo;
    this.busca = '';
    this.filtros = {};
    this.filtrosModal = {};
    this.pagina = 0;
    this.eventos = [];
    this.carregarEventos();
  }

  buscar(termo: string): void {
    this.busca = termo;
    this.pagina = 0;
    this.carregarEventos();
  }

  irParaPagina(pagina: number): void {
    this.pagina = pagina;
    this.carregarEventos();
  }

  mudarTamanho(tamanho: number): void {
    this.tamanho = tamanho;
    this.pagina = 0;
    this.carregarEventos();
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

    const { dataInicial, dataFinal, idRegistro, idResponsavel } = this.filtrosModal;
    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      this.erroFiltros = 'A data final não pode ser anterior à data inicial.';
      return;
    }

    const ids = [idRegistro, idResponsavel];
    if (ids.some(id => id != null && (!Number.isInteger(id) || id < 1))) {
      this.erroFiltros = 'Informe IDs inteiros e positivos.';
      return;
    }

    this.filtros = { ...this.filtrosModal };
    this.filtrosAberto = false;
    this.pagina = 0;
    this.carregarEventos();
  }

  limparFiltros(): void {
    this.filtros = {};
    this.filtrosModal = {};
    this.filtrosAberto = false;
    this.pagina = 0;
    this.carregarEventos();
  }

  abrirDetalhes(id: number): void {
    this.detalheSub?.unsubscribe();
    this.idDetalhe = id;
    this.detalhe = null;
    this.detalhesAberto = true;
    this.carregandoDetalhe = true;
    this.erroDetalhe = false;

    this.detalheSub = this.historicoService.detalhar(id).subscribe({
      next: detalhe => {
        this.detalhe = detalhe;
        this.carregandoDetalhe = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.erroDetalhe = true;
        this.carregandoDetalhe = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  tentarDetalhesNovamente(): void {
    if (this.idDetalhe !== null) {
      this.abrirDetalhes(this.idDetalhe);
    }
  }

  fecharDetalhes(): void {
    this.detalheSub?.unsubscribe();
    this.detalhesAberto = false;
    this.detalhe = null;
  }

  identificarResponsavel(evento: HistoricoEvento): string {
    return evento.idResponsavel === null
      ? evento.nomeResponsavel
      : `${evento.nomeResponsavel} (ID ${evento.idResponsavel})`;
  }

  formatarDataHora(valor: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(valor)).replace(', ', ' às ');
  }

  formatarValorAnterior(campo: CampoHistorico): string {
    if (!campo.anteriorConhecido) {
      return 'Referência desconhecida';
    }
    if (this.detalhe?.evento.tipoAlteracao === 'CADASTRO') {
      return 'Não se aplica';
    }
    return this.formatarValor(campo.valorAnterior);
  }

  formatarValorNovo(campo: CampoHistorico): string {
    if (this.detalhe?.evento.tipoAlteracao === 'EXCLUSAO') {
      return 'Registro excluído';
    }
    return this.formatarValor(campo.valorNovo);
  }

  formatarValor(valor: ValorHistorico): string {
    if (valor === null || valor === '') {
      return 'Vazio';
    }
    if (typeof valor === 'boolean') {
      return valor ? 'Sim' : 'Não';
    }
    if (Array.isArray(valor)) {
      return valor.length ? valor.map(item => this.formatarValor(item)).join('; ') : 'Nenhum';
    }
    if (typeof valor === 'object') {
      const nome = valor['nome'] ?? valor['nomeCompleto'] ?? valor['nome_completo'];
      if (nome) {
        return valor['id'] ? `${nome} (ID ${valor['id']})` : String(nome);
      }
      return Object.entries(valor)
        .map(([campo, conteudo]) => `${campo}: ${this.formatarValor(conteudo)}`)
        .join('; ') || 'Não informado';
    }
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return valor.split('-').reverse().join('/');
    }
    return String(valor);
  }
}
