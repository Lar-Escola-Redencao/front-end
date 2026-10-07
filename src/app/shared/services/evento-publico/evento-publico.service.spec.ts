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

describe('EventoPublicoService.buscarPorId', () => {
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
