import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContatoService } from './contato.service';

describe('Ordenação de contatos por vínculos', () => {
  it('envia a ordenação à API e usa os totais retornados', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(ContatoService);
    let resultado: any;
    service.listarContatos(1, 2, 'quantidadeVinculos,asc', 'Maria').subscribe(resposta => resultado = resposta);
    const pagina = http.expectOne(req => req.params.get('page') === '1');
    expect(pagina.request.params.get('sort')).toBe('quantidadeVinculos,asc');
    expect(pagina.request.params.get('search')).toBe('Maria');
    pagina.flush({
      content: [{ id: 3, quantidadeVinculos: 0 }, { id: 4, quantidadeVinculos: 2 }],
      page: { number: 1, size: 2, totalElements: 4, totalPages: 2 }
    });
    expect(resultado.content.map((contato: any) => contato.id)).toEqual([3, 4]);
    expect(resultado.page).toMatchObject({ totalElements: 4, totalPages: 2 });
    http.verify();
  });
});
