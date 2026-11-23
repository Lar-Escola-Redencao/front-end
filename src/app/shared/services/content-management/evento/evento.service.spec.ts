import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventoService } from './evento.service';
import { TipoEvento } from 'src/app/shared/models/evento.model';

describe('Envio das categorias dos eventos', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()]
  }));

  it('consulta os eventos pela data decrescente com desempate por ID antes da paginação', () => {
    const service = TestBed.inject(EventoService);
    const http = TestBed.inject(HttpTestingController);
    service.listarTodos(2, 10).subscribe();
    const request = http.expectOne(req => req.method === 'GET');
    expect(request.request.params.getAll('sort')).toEqual(['dataEvento,desc', 'id,desc']);
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ content: [] });
    http.verify();
  });

  it.each([
    ['titulo,asc', ['titulo,asc', 'id,desc']],
    ['id,asc', ['id,asc']],
  ])('preserva a ordenação manual %s', (sort, esperado) => {
    const service = TestBed.inject(EventoService);
    const http = TestBed.inject(HttpTestingController);
    service.listarTodos(0, 10, sort as string).subscribe();
    const request = http.expectOne(req => req.method === 'GET');
    expect(request.request.params.getAll('sort')).toEqual(esperado);
    request.flush({ content: [] });
    http.verify();
  });

  for (const editar of [false, true]) {
    it(`envia todas as categorias no multipart de ${editar ? 'edição' : 'cadastro'}`, () => {
      const service = TestBed.inject(EventoService);
      const http = TestBed.inject(HttpTestingController);
      const dto = { titulo: 'Noite italiana', descricao: 'Jantar e música',
        dataEvento: '2027-01-10T19:00:00', endereco: 'Rua das Flores',
        categorias: [TipoEvento.BENEFICENTE, TipoEvento.CULTURAL] };
      (editar ? service.atualizar(7, dto) : service.criar(dto)).subscribe();
      const request = http.expectOne(req => req.method === (editar ? 'PUT' : 'POST'));
      expect((request.request.body as FormData).getAll('categorias')).toEqual(['BENEFICENTE', 'CULTURAL']);
      request.flush({});
      http.verify();
    });
  }
});
