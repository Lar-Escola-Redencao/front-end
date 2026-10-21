import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HistoricoService } from 'src/app/shared/services/historico/historico.service';
import { HistoricoDetalhe, HistoricoEvento } from 'src/app/shared/models/historico.model';
import { Historico } from './historico';

describe('Historico', () => {
  const evento: HistoricoEvento = {
    id: 1,
    revisao: 2,
    dataHora: '2026-10-20T23:30:00-03:00',
    idResponsavel: 3,
    nomeResponsavel: 'Responsável',
    tipoRegistro: 'CONTATOS',
    informacaoAlterada: 'Contato',
    idRegistro: 4,
    identificacaoRegistro: 'Maria (ID 4)',
    registroExcluido: false,
    tipoAlteracao: 'EDICAO'
  };
  const resposta = { content: [evento], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } };
  let componente: Historico;
  let servico: { listar: ReturnType<typeof vi.fn>; detalhar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    servico = { listar: vi.fn().mockReturnValue(of(resposta)), detalhar: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [Historico],
      providers: [{ provide: HistoricoService, useValue: servico }]
    }).compileComponents();
    componente = TestBed.createComponent(Historico).componentInstance;
  });

  it('carrega eventos e paginação retornados pela API', () => {
    componente.ngOnInit();
    expect(componente.eventos).toEqual([evento]);
    expect(componente.totalElementos).toBe(1);
    expect(componente.carregandoLista).toBe(false);
  });

  it('troca a categoria limpando busca, filtros e página', () => {
    componente.busca = 'Maria';
    componente.filtros = { idRegistro: 4 };
    componente.pagina = 2;
    componente.trocarTipo('PRESENCAS');
    expect(servico.listar).toHaveBeenLastCalledWith('PRESENCAS', 0, 10, '', {});
  });

  it('cancela consulta antiga para não sobrescrever a categoria atual', () => {
    const antiga = new Subject<typeof resposta>();
    servico.listar.mockReturnValueOnce(antiga);
    componente.carregarEventos();
    componente.trocarTipo('CONTATOS');
    antiga.next({ ...resposta, content: [] });
    expect(componente.eventos).toEqual([evento]);
  });

  it('mostra falha de listagem e permite nova tentativa', () => {
    servico.listar.mockReturnValueOnce(throwError(() => new Error('Falha de rede')));
    componente.carregarEventos();
    expect(componente.erroLista).toBe(true);
    expect(componente.carregandoLista).toBe(false);
    componente.carregarEventos();
    expect(componente.erroLista).toBe(false);
    expect(componente.eventos).toEqual([evento]);
  });

  it('combina filtros válidos com a busca e retorna à primeira página', () => {
    componente.busca = 'Maria';
    componente.pagina = 2;
    componente.filtrosModal = { idResponsavel: 3, dataInicial: '2026-10-20', dataFinal: '2026-10-20' };
    componente.aplicarFiltros({ invalid: false } as NgForm);
    expect(servico.listar).toHaveBeenLastCalledWith('COLABORADORES', 0, 10, 'Maria', componente.filtrosModal);
    expect(componente.filtrosAberto).toBe(false);
  });

  it('rejeita intervalo invertido e IDs fracionários sem consultar a API', () => {
    componente.filtrosModal = { dataInicial: '2026-10-21', dataFinal: '2026-10-20' };
    componente.aplicarFiltros({ invalid: false } as NgForm);
    expect(componente.erroFiltros).toContain('data final');
    componente.filtrosModal = { idRegistro: 1.5 };
    componente.aplicarFiltros({ invalid: false } as NgForm);
    expect(componente.erroFiltros).toContain('inteiros');
    expect(servico.listar).not.toHaveBeenCalled();
  });

  it('recupera detalhe após erro e não exibe ID de frequência como campo', () => {
    const detalhe: HistoricoDetalhe = {
      evento: { ...evento, tipoRegistro: 'PRESENCAS', idRegistro: null },
      identificadorEspecifico: '4',
      referenciaAnteriorDisponivel: true,
      observacao: null,
      contextoAnterior: {},
      contextoNovo: {},
      campos: [
        { campo: 'id', nome: 'ID', valorAnterior: null, valorNovo: 4, anteriorConhecido: true },
        { campo: 'presente', nome: 'Presença', valorAnterior: false, valorNovo: true, anteriorConhecido: true }
      ]
    };
    servico.detalhar.mockReturnValueOnce(throwError(() => new Error('Falha'))).mockReturnValueOnce(of(detalhe));
    componente.abrirDetalhes(1);
    expect(componente.erroDetalhe).toBe(true);
    componente.tentarDetalhesNovamente();
    expect(componente.erroDetalhe).toBe(false);
    expect(componente.camposDetalhe.map(campo => campo.campo)).toEqual(['presente']);
  });

  it('distingue referência desconhecida, campo vazio e valores preenchidos', () => {
    expect(componente.formatarValorAnterior({ campo: 'nome', nome: 'Nome', valorAnterior: null, valorNovo: 'Maria', anteriorConhecido: false })).toBe('Referência desconhecida');
    expect(componente.formatarValor(null)).toBe('Vazio');
    expect(componente.formatarValor(false)).toBe('Não');
    expect(componente.formatarValor('2026-10-20')).toBe('20/10/2026');
    expect(componente.formatarValor([{ id: 2, nome: 'Unidade' }])).toBe('Unidade (ID 2)');
  });
});
