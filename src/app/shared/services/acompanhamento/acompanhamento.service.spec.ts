import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AcompanhamentoService } from './acompanhamento.service';
import { environment } from 'src/environments/environment';

describe('Consultas de frequência do acompanhamento', () => {
  let api: AcompanhamentoService; let http: HttpTestingController;
  const url = `${environment.apiUrl}/acompanhamento/usuarios/10/frequencias`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AcompanhamentoService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('envia o intervalo e omite matrícula para consultar todas as acessíveis', () => {
    api.frequencias(10, { inicio: '2026-01-01', fim: '2026-12-31', matricula: null }).subscribe();
    const r = http.expectOne(req => req.url === url);
    expect(r.request.params.get('inicio')).toBe('2026-01-01');
    expect(r.request.params.get('fim')).toBe('2026-12-31');
    expect(r.request.params.has('matricula')).toBe(false); r.flush({});
  });
  it('envia a matrícula selecionada e consulta as opções no endpoint protegido', () => {
    api.frequencias(10, { inicio: '2026-10-01', fim: '2026-10-29', matricula: 7 }).subscribe();
    const r = http.expectOne(req => req.url === url);
    expect(r.request.params.get('matricula')).toBe('7'); r.flush({});
    api.matriculasFrequencia(10).subscribe(); http.expectOne(`${url}/matriculas`).flush([]);
  });
});
