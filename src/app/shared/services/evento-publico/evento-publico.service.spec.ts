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
  comentarioPosEvento: null,
  midiaEvento: [],
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

  it('resolve as urls de imagem do evento e dos parceiros', () => {
    const { resultado } = buscar();

    httpMock.expectOne(`${api}/7`).flush(eventoApi);

    expect(resultado()?.titulo).toBe('Corrida Beneficente');
    expect(resultado()?.imagem).toBe(`${environment.apiUrl}/uploads/eventos/capa.jpg`);
    expect(resultado()?.parceiros[0].logo).toBe(`${environment.apiUrl}/uploads/parceiros/lupo.png`);
  });

  it('propaga o erro quando o evento nao existe', () => {
    let erro: { status?: number } | undefined;
    service.buscarPorId(7).subscribe({ error: e => (erro = e) });

    httpMock.expectOne(`${api}/7`).flush('nao encontrado', { status: 404, statusText: 'Not Found' });

    expect(erro?.status).toBe(404);
  });
});
