import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { PublicContentService } from './public-content.service';

describe('Falhas nas consultas públicas', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each(['getUnidades', 'getParceirosAtivos', 'getDiretoriaAtiva'] as const)(
    'preserva o erro de %s para a tela distinguir de conteúdo vazio', metodo => {
      const erro = vi.fn();
      const resultado = vi.fn();
      const consulta: Observable<unknown[]> = TestBed.inject(PublicContentService)[metodo]();
      consulta.subscribe({ next: resultado, error: erro });
      TestBed.inject(HttpTestingController).expectOne(() => true)
        .flush({}, { status: 503, statusText: 'Service Unavailable' });
      expect(resultado).not.toHaveBeenCalled();
      expect(erro).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
    },
  );
});
