import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, Subject } from 'rxjs';
import { Auth } from '../../../shared/services/auth/auth';
import { Login } from './login';

describe('Login — proteção CAPTCHA', () => {
  afterEach(() => TestBed.resetTestingModule());

  function preparar() {
    const resposta = new Subject<never>();
    const auth = { login: vi.fn((_dados: object, _lembrar: boolean) => resposta) };
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: Auth, useValue: auth },
        { provide: ToastrService, useValue: { warning: vi.fn(), clear: vi.fn() } },
        { provide: ActivatedRoute, useValue: {
          queryParamMap: of(convertToParamMap({})), snapshot: { queryParamMap: convertToParamMap({}) },
        } }],
    }).overrideComponent(Login, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const tela = fixture.componentInstance as any;
    tela.form.setValue({ identifier: 'pessoa@exemplo.com', password: 'senha', remember: false });
    return { tela, auth, resposta };
  }

  it('começa sem CAPTCHA e impede um segundo envio em andamento', () => {
    const { tela, auth } = preparar();
    expect(tela.captchaObrigatorio()).toBe(false);
    tela.submit();
    tela.submit();
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(auth.login.mock.calls[0][0]).not.toHaveProperty('captchaToken');
  });

  it('usa a decisão da API e exige uma nova comprovação após falha', () => {
    const { tela, auth, resposta } = preparar();
    tela.submit();
    resposta.error(new HttpErrorResponse({ status: 401, error: { captchaRequired: true } }));
    expect(tela.captchaObrigatorio()).toBe(true);
    tela.submit();
    expect(auth.login).toHaveBeenCalledTimes(1);
    tela.captchaToken.set('comprovacao');
    tela.submit();
    expect(auth.login.mock.calls[1][0]).toHaveProperty('captchaToken', 'comprovacao');
    expect(tela.captchaToken()).toBe('');
  });

  it('respeita o tempo retornado pela API', () => {
    const { tela, auth, resposta } = preparar();
    tela.submit();
    resposta.error(new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '60' }),
      error: { message: 'Aguarde.', retryAfterSeconds: 60 } }));
    expect(tela.tempoEspera()).toBe(60);
    expect(tela.errorMessage()).toBe('Aguarde.');
    tela.submit();
    expect(auth.login).toHaveBeenCalledTimes(1);
  });
});
