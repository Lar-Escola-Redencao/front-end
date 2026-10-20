import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from 'src/environments/environment';
import { Evento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from './evento-publico.service';

const api = `${environment.apiUrl}/evento`;

const eventoApi = {
  id: 7,
  titulo: 'Corrida Beneficente',
  descricao: 'Descricao',
  dataEvento: '2026-08-30T06:00:00',
  endereco: 'Parque Infantil',
  imagem: '/uploads/eventos/capa.jpg',
  valor: null,
  tipoEvento: 'ARRECADACAO',
  parceiros: [{ id: 1, nome: 'Lupo', logo: '/uploads/parceiros/lupo.png' }]
};

describe('EventoPublicoService', () => {
  let service: EventoPublicoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(EventoPublicoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  it('carrega todas as páginas públicas sem aplicar filtros e inclui eventos antigos', () => {
    let resultado: Evento[] = [];
    service.listarPublicos().subscribe(eventos => resultado = eventos);
    const primeira = httpMock.expectOne(req => req.url === `${api}/todos` && req.params.get('page') === '0');
    expect(primeira.request.params.get('size')).toBe('50');
    expect(primeira.request.params.getAll('sort')).toEqual(['dataEvento,asc', 'id,asc']);
    expect(primeira.request.params.has('tipo')).toBe(false);
    expect(primeira.request.params.has('dataInicial')).toBe(false);
    expect(primeira.request.params.has('dataFinal')).toBe(false);
    expect(primeira.request.params.has('valor')).toBe(false);
    primeira.flush({
      content: [{ ...eventoApi, id: 1, dataEvento: '2020-01-01T10:00:00' }],
      page: { number: 0, size: 50, totalElements: 2, totalPages: 2 },
    });
    expect(resultado).toEqual([]);
    const segunda = httpMock.expectOne(req => req.url === `${api}/todos` && req.params.get('page') === '1');
    segunda.flush({
      content: [{ ...eventoApi, id: 2, dataEvento: '2030-01-01T10:00:00' }],
      page: { number: 1, size: 50, totalElements: 2, totalPages: 2 },
    });
    expect(resultado.map(evento => evento.id)).toEqual([1, 2]);
  });

  function buscar(): { resultado: () => Evento | undefined } {
    let resultado: Evento | undefined;
    service.buscarPorId(7).subscribe(evento => (resultado = evento));
    return { resultado: () => resultado };
  }

  it('junta o detalhe do evento com as redes sociais vinculadas', () => {
    const { resultado } = buscar();

    httpMock.expectOne(`${api}/7`).flush(eventoApi);
    httpMock.expectOne(`${api}/7/redes-sociais`).flush([
      { idRedeSocial: 1, nome: 'Facebook', icone: '/images/redes-sociais/facebook.svg', urlLink: 'https://facebook.com/post' },
      { idRedeSocial: 2, nome: 'Instagram', icone: 'https://cdn.example/ig.svg', urlLink: 'https://instagram.com/p/1' }
    ]);

    expect(resultado()?.imagem).toBe(`${environment.apiUrl}/uploads/eventos/capa.jpg`);
    expect(resultado()?.parceiros[0].logo).toBe(`${environment.apiUrl}/uploads/parceiros/lupo.png`);
    expect(resultado()?.redesSociais).toEqual([
      { idRedeSocial: 1, nome: 'Facebook', icone: '/images/redes-sociais/facebook.svg', urlLink: 'https://facebook.com/post' },
      { idRedeSocial: 2, nome: 'Instagram', icone: 'https://cdn.example/ig.svg', urlLink: 'https://instagram.com/p/1' }
    ]);
  });

  it('mantem caminho de logo que ja veio prefixado com /api', () => {
    const { resultado } = buscar();

    httpMock.expectOne(`${api}/7`).flush({
      ...eventoApi,
      parceiros: [{ id: 1, nome: 'Nigro', logo: '/api/uploads/parceiros/nigro.png' }]
    });
    httpMock.expectOne(`${api}/7/redes-sociais`).flush([]);

    expect(resultado()?.parceiros[0].logo).toBe('/api/uploads/parceiros/nigro.png');
  });

  it('ignora vinculos sem link', () => {
    const { resultado } = buscar();

    httpMock.expectOne(`${api}/7`).flush(eventoApi);
    httpMock.expectOne(`${api}/7/redes-sociais`).flush([
      { idRedeSocial: 1, nome: 'Facebook', icone: 'fb.svg', urlLink: '  ' }
    ]);

    expect(resultado()?.redesSociais).toEqual([]);
  });

  it('ignora vinculos sem icone, mesmo com link valido', () => {
    const { resultado } = buscar();

    httpMock.expectOne(`${api}/7`).flush(eventoApi);
    httpMock.expectOne(`${api}/7/redes-sociais`).flush([
      { idRedeSocial: 1, nome: 'Facebook', icone: '', urlLink: 'https://facebook.com/post' }
    ]);

    expect(resultado()?.redesSociais).toEqual([]);
  });

  it('retorna lista vazia quando o evento nao tem redes sociais', () => {
    const { resultado } = buscar();

    httpMock.expectOne(`${api}/7`).flush(eventoApi);
    httpMock.expectOne(`${api}/7/redes-sociais`).flush([]);

    expect(resultado()?.redesSociais).toEqual([]);
  });

  it('ainda retorna o evento quando o endpoint de redes sociais falha', () => {
    const { resultado } = buscar();

    httpMock.expectOne(`${api}/7`).flush(eventoApi);
    httpMock.expectOne(`${api}/7/redes-sociais`).flush('erro', { status: 500, statusText: 'Server Error' });

    expect(resultado()?.titulo).toBe('Corrida Beneficente');
    expect(resultado()?.redesSociais).toEqual([]);
  });

  it('propaga o erro quando o evento nao existe', () => {
    let erro: { status?: number } | undefined;
    service.buscarPorId(7).subscribe({ error: e => (erro = e) });

    // o forkJoin cancela a chamada de redes sociais assim que o detalhe falha
    httpMock.expectOne(`${api}/7`).flush('nao encontrado', { status: 404, statusText: 'Not Found' });

    expect(erro?.status).toBe(404);
  });
});
