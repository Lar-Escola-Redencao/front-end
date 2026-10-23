import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HistoricoService } from 'src/app/shared/services/historico/historico.service';
import { AtividadeHistorico, HistoricoEvento } from 'src/app/shared/models/historico.model';
import { Historico } from './historico';

const evento: HistoricoEvento = {
  id: 1, revisao: 2, dataHora: '2026-10-20T23:30:00-03:00', idResponsavel: 3,
  nomeResponsavel: 'Ana', tipoRegistro: 'CONTATOS', informacaoAlterada: 'Contato',
  idRegistro: 4, identificacaoRegistro: 'Maria', registroExcluido: false, tipoAlteracao: 'EDICAO'
};
const atividade: AtividadeHistorico = { evento, resumo: 'Ana alterou telefone.', registros: [evento] };
const resposta = { content: [atividade], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } };

describe('Histórico de atividades', () => {
  let componente: Historico;
  let parametros: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let servico: { atividades: ReturnType<typeof vi.fn>; responsaveis: ReturnType<typeof vi.fn>; marcarLido: ReturnType<typeof vi.fn> };
  let navegar: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    parametros = new BehaviorSubject(convertToParamMap({}));
    servico = { atividades: vi.fn().mockReturnValue(of(resposta)), responsaveis: vi.fn().mockReturnValue(of([])), marcarLido: vi.fn().mockReturnValue(of(undefined)) };
    navegar = vi.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [Historico],
      providers: [
        { provide: HistoricoService, useValue: servico },
        { provide: ActivatedRoute, useValue: { queryParamMap: parametros } },
        { provide: Router, useValue: { navigate: navegar } }
      ]
    }).compileComponents();
    componente = TestBed.createComponent(Historico).componentInstance;
  });

  afterEach(() => componente.ngOnDestroy());

  it('pagina atividades agrupadas preservando todos os registros nos detalhes', () => {
    componente.ngOnInit();
    expect(componente.eventos).toEqual([evento]);
    expect(componente.totalElementos).toBe(1);
    componente.abrirDetalhes(1);
    expect(componente.registrosDetalhe).toEqual([evento]);
  });

  it('abre todas as áreas quando a URL não informa uma área', () => {
    parametros.next(convertToParamMap({}));
    componente.ngOnInit();
    expect(componente.todasAreas).toBe(true);
    expect(servico.atividades).toHaveBeenLastCalledWith(null, 0, 10, '', expect.anything(), undefined);
  });

  it('restaura o contexto do usuário recebido pelo histórico local', () => {
    parametros.next(convertToParamMap({ tipoRegistro: 'TODOS', idUsuario: '12', periodo: 'TODOS' }));
    componente.ngOnInit();
    expect(servico.atividades).toHaveBeenLastCalledWith(null, 0, 10, '', expect.objectContaining({ idUsuario: 12, periodo: 'TODOS' }), undefined);
    expect(componente.temContexto).toBe(true);
  });

  it('separa arquivados mantendo busca e contexto na URL', () => {
    componente.contexto = { idUsuario: 12 };
    componente.busca = 'Maria';
    componente.pagina = 3;
    componente.trocarPeriodo('ARQUIVADOS');
    expect(navegar).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: expect.objectContaining({
      idUsuario: 12, search: 'Maria', periodo: 'ARQUIVADOS', page: null
    }) }));
  });

  it('preserva filtros compatíveis ao trocar de área', () => {
    componente.filtros = { idResponsavel: 3, dataInicial: '2026-10-01', dataAula: '2026-10-20' };
    componente.trocarTipo('CONTATOS');
    expect(componente.filtros.idResponsavel).toBe(3);
    expect(componente.filtros.dataInicial).toBe('2026-10-01');
    expect(componente.filtros.dataAula).toBe('');
  });

  it('cancela respostas antigas quando uma nova consulta começa', () => {
    const antiga = new Subject<typeof resposta>();
    servico.atividades.mockReturnValueOnce(antiga);
    componente.carregarEventos();
    componente.carregarEventos();
    antiga.next({ ...resposta, content: [] });
    expect(componente.eventos).toEqual([evento]);
  });

  it('permite tentar novamente após falha de carregamento', () => {
    servico.atividades.mockReturnValueOnce(throwError(() => new Error('Falha de rede')));
    componente.carregarEventos();
    expect(componente.erroLista).toBe(true);
    componente.carregarEventos();
    expect(componente.erroLista).toBe(false);
  });

  it('rejeita intervalo invertido antes de navegar', () => {
    componente.filtrosModal = { dataInicial: '2026-10-21', dataFinal: '2026-10-20' };
    componente.aplicarFiltros({ invalid: false } as NgForm);
    expect(componente.erroFiltros).toContain('data final');
    expect(navegar).not.toHaveBeenCalled();
  });
  it('preserva contexto e filtros ao ordenar e volta à primeira página', () => {
    componente.contexto = { idUsuario: 12 };
    componente.filtros = { idResponsavel: 3 };
    componente.pagina = 2;
    componente.ordenarPor('nomeResponsavel');
    expect(navegar).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: expect.objectContaining({
      idUsuario: 12, idResponsavel: 3, page: null, sort: 'nomeResponsavel,asc'
    }) }));
    componente.ordenarPor('nomeResponsavel');
    expect(componente.sort).toBe('nomeResponsavel,desc');
  });

  it('restaura ordenação ao reabrir a URL e envia ao back-end', () => {
    parametros.next(convertToParamMap({ sort: 'identificacaoRegistro,asc', page: '2' }));
    componente.ngOnInit();
    expect(componente.ordenacao).toEqual({ campo: 'identificacaoRegistro', direcao: 'asc' });
    expect(servico.atividades).toHaveBeenLastCalledWith(null, 2, 10, '', expect.anything(), 'identificacaoRegistro,asc');
  });

  it('limpa o ID do responsável ao editar o nome selecionado', () => {
    componente.alterarBuscaResponsavel({ id: 3, nome: 'Ana' });
    expect(componente.filtrosModal.idResponsavel).toBe(3);
    componente.alterarBuscaResponsavel('Anabela');
    expect(componente.filtrosModal.idResponsavel).toBeNull();
    componente.aplicarFiltros({ invalid: false } as NgForm);
    expect(componente.erroFiltros).toContain('Selecione um responsável');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('oferece sugestões por nome com dois caracteres após 400 ms', () => {
    vi.useFakeTimers();
    try {
      servico.responsaveis.mockReturnValue(of([{ id: 3, nome: 'Ana' }, { id: 4, nome: 'Pedro' }]));
      componente.ngOnInit();
      componente.alterarBuscaResponsavel('A');
      vi.advanceTimersByTime(400);
      expect(componente.responsaveisFiltrados).toEqual([]);
      componente.alterarBuscaResponsavel('AN');
      vi.advanceTimersByTime(399);
      expect(componente.responsaveisFiltrados).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(componente.responsaveisFiltrados).toEqual([{ id: 3, nome: 'Ana' }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('registra a leitura dos eventos exibidos para atualizar os ícones gerais', () => {
    componente.ngOnInit();
    expect(servico.marcarLido).toHaveBeenCalledWith(null, expect.objectContaining({ periodo: 'TODOS' }), 1);
  });

  it('não marca o contexto inteiro como lido quando há busca parcial', () => {
    parametros.next(convertToParamMap({ search: 'Maria' }));
    componente.ngOnInit();
    expect(servico.marcarLido).not.toHaveBeenCalled();
  });

});
