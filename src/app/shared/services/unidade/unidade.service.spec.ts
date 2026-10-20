import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UnidadeService } from './unidade.service';

describe('Unidades nos filtros', () => {
  it('carrega todas as páginas antes de entregar o dropdown', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    let resultado: any;
    TestBed.inject(UnidadeService).listarTodas().subscribe(dados => resultado = dados);
    http.expectOne(r => r.url.endsWith('/unidade/todas') && r.params.get('page') === '0')
      .flush({ content: [{ id: 1, nome: 'Sede' }], page: { number: 0, totalPages: 2 } });
    expect(resultado).toBeUndefined();
    http.expectOne(r => r.url.endsWith('/unidade/todas') && r.params.get('page') === '1')
      .flush({ content: [{ id: 2, nome: 'Outra unidade' }], page: { number: 1, totalPages: 2 } });
    expect(resultado.map((u: any) => u.id)).toEqual([1, 2]);
    http.verify();
  });
});
