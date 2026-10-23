import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';

import { HistoricoService } from './historico.service';
import { HistoricoAtualizacoesService } from './historico-atualizacoes.service';

describe('HistoricoService', () => {
  let servico: HistoricoService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/historico-alteracoes`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(HistoricoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia busca, filtros e paginação no contrato da API', () => {
    servico.listar('CONTATOS', 2, 25, ' Maria ', { idRegistro: 4, idResponsavel: 3, dataFinal: '2026-10-20', tipoAlteracao: 'EDICAO' }).subscribe();
    const requisicao = http.expectOne(req => req.url === url);
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.keys().sort()).toEqual(['tipoRegistro', 'page', 'size', 'search', 'idRegistro', 'idResponsavel', 'dataFinal', 'tipoAlteracao'].sort());
    expect(requisicao.request.params.get('search')).toBe('Maria');
    expect(requisicao.request.params.get('page')).toBe('2');
    expect(requisicao.request.params.get('size')).toBe('25');
    requisicao.flush({ content: [], page: { number: 2, size: 25, totalElements: 0, totalPages: 0 } });
  });

  it('omite busca vazia e consulta detalhes pelo ID do evento', () => {
    servico.listar('PRESENCAS', 0, 10, ' ', {}).subscribe();
    const listagem = http.expectOne(req => req.url === url);
    expect(listagem.request.params.has('search')).toBe(false);
    expect(listagem.request.params.has('idRegistro')).toBe(false);
    listagem.flush({ content: [], page: { number: 0, size: 10, totalElements: 0, totalPages: 0 } });
    servico.detalhar(12).subscribe();
    http.expectOne(`${url}/12`).flush({});
  });
  it('envia ordenação junto aos filtros das atividades agrupadas', () => {
    servico.atividades(null, 1, 5, ' Ana ', { idResponsavel: 3 }, 'nomeResponsavel,asc').subscribe();
    const requisicao = http.expectOne(req => req.url === `${url}/atividades`);
    expect(requisicao.request.params.get('sort')).toBe('nomeResponsavel,asc');
    expect(requisicao.request.params.get('page')).toBe('1');
    expect(requisicao.request.params.get('idResponsavel')).toBe('3');
    expect(requisicao.request.params.get('search')).toBe('Ana');
    requisicao.flush({ content: [], page: { number: 1, size: 5, totalElements: 0, totalPages: 0 } });
  });

  it('avisa os ícones somente depois que o servidor confirma a leitura', () => {
    let avisos = 0;
    const sub = servico.leituraAlterada.subscribe(() => avisos++);
    servico.marcarLido(null, { periodo: 'TODOS' }, 10).subscribe();
    const requisicao = http.expectOne(req => req.url === `${url}/atividades/leitura`);
    expect(avisos).toBe(0);
    expect(requisicao.request.body).toEqual({ ultimoEvento: 10 });
    requisicao.flush(null);
    expect(avisos).toBe(1);
    sub.unsubscribe();
  });

  it('consulta as novidades ao receber um aviso de sucesso', () => {
    const assinatura = servico.novidadesGerais.subscribe();
    const inicial = http.expectOne(req => req.url === `${url}/atividades/leitura`);
    inicial.flush({ ultimoEvento: 0, ultimoLido: 0, temNovidades: false });
    TestBed.inject(HistoricoAtualizacoesService).sucesso.next();
    const aposSucesso = http.expectOne(req => req.url === `${url}/atividades/leitura`);
    expect(aposSucesso.request.params.get('periodo')).toBe('TODOS');
    aposSucesso.flush({ ultimoEvento: 10, ultimoLido: 0, temNovidades: true });
    assinatura.unsubscribe();
  });

});
