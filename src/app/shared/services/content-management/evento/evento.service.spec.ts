import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EventoService } from './evento.service';
import { TipoEvento } from 'src/app/shared/models/evento.model';

describe('Envio das categorias dos eventos', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()]
  }));

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
