import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContatoService } from './contato.service';

describe('Ordenação de contatos por vínculos', () => {
  it('ordena todos os resultados antes de paginar e preserva zero', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(ContatoService);
    let resultado: any;
    service.listarOrdenadosPorVinculos(0, 2, 'asc').subscribe(resposta => resultado = resposta);
    const primeira = http.expectOne(req => req.params.get('page') === '0');
    expect(primeira.request.params.get('sort')).toBe('id,asc');
    primeira.flush({ content: [{ id: 1, quantidadeVinculos: 8 }, { id: 2, quantidadeVinculos: 4 }], page: { number: 0, totalPages: 2 } });
    const segunda = http.expectOne(req => req.params.get('page') === '1');
    segunda.flush({ content: [{ id: 3, quantidadeVinculos: 0 }, { id: 4, quantidadeVinculos: 2 }], page: { number: 1, totalPages: 2 } });
    expect(resultado.content.map((contato: any) => contato.id)).toEqual([3, 4]);
    expect(resultado.page).toMatchObject({ totalElements: 4, totalPages: 2 });
    http.verify();
  });
});
