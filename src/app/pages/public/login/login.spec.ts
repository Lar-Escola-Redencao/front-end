import { ToastrService } from 'ngx-toastr';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Login } from './login';

describe('Login', () => {
  let queryParamMap$: BehaviorSubject<ParamMap>;
  let fixture: ComponentFixture<Login>;
  let toastr: { warning: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> };

  function setup(initialParams: Record<string, string> = {}): void {
    toastr = { warning: vi.fn(() => ({ toastId: 1 })), clear: vi.fn() };
    queryParamMap$ = new BehaviorSubject(convertToParamMap(initialParams));

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ToastrService, useValue: toastr },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$,
            snapshot: { queryParamMap: convertToParamMap(initialParams) },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    TestBed.flushEffects();
    TestBed.inject(HttpTestingController)
      .match(`${environment.apiUrl}/rede-social/todas`)
      .forEach((request) => request.flush([]));
  }

  it('does not show a session warning on a plain login visit', () => {
    setup();
    expect(toastr.warning).not.toHaveBeenCalled();
  });

  it('exibe o spinner à direita, bloqueia novos envios e libera o botão após falha', () => {
    setup();
    const httpMock = TestBed.inject(HttpTestingController);
    const identifier: HTMLInputElement = fixture.nativeElement.querySelector('#identifier');
    identifier.value = 'user@example.com';
    identifier.dispatchEvent(new Event('input'));
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    password.value = 'secret';
    password.dispatchEvent(new Event('input'));
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const button: HTMLButtonElement = form.querySelector('button[type="submit"]')!;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent?.trim()).toBe('Entrando');
    expect(button.lastElementChild?.classList.contains('spinner-carregamento')).toBe(true);

    form.dispatchEvent(new Event('submit'));
    const request = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    request.flush({}, { status: 500, statusText: 'Erro' });
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
    expect(button.querySelector('.spinner-carregamento')).toBeNull();
    expect(button.textContent?.trim()).toBe('Entrar');
    httpMock.verify();
  });

  it('uses the standard yellow toast at the top right for expired sessions', () => {
    setup({ reason: 'expired' });
    expect(toastr.warning).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('expirou'), expect.any(String),
      { positionClass: 'toast-top-right', timeOut: 6000, closeButton: true },
    );
    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });

  it('uses the same standard toast for invalid authentication', () => {
    setup({ reason: 'invalid' });
    expect(toastr.warning).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('Acesso negado'), expect.any(String),
      { positionClass: 'toast-top-right', timeOut: 6000, closeButton: true },
    );
  });

  it('does not duplicate the warning when unrelated query params change', () => {
    setup({ reason: 'expired' });
    queryParamMap$.next(convertToParamMap({ reason: 'expired', returnUrl: '/dashboard' }));
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(toastr.warning).toHaveBeenCalledTimes(1);
  });

  it('clears only its session warning when leaving the login page', () => {
    setup({ reason: 'expired' });
    fixture.destroy();
    expect(toastr.clear).toHaveBeenCalledWith(1);
  });

  describe('identifier field (e-mail/CPF mask)', () => {
    function identifierInput(): HTMLInputElement {
      return fixture.nativeElement.querySelector('#identifier');
    }

    function typeIntoIdentifier(value: string): void {
      const input = identifierInput();
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    it('masks digits-only input as a CPF in real time', () => {
      setup();

      typeIntoIdentifier('12345678901');

      expect(identifierInput().value).toBe('123.456.789-01');
    });

    it('drops the CPF mask the instant a letter or "@" appears', () => {
      setup();

      typeIntoIdentifier('123email');

      expect(identifierInput().value).toBe('123email');
    });

    it('leaves an e-mail untouched as it is typed', () => {
      setup();

      typeIntoIdentifier('user@example.com');

      expect(identifierInput().value).toBe('user@example.com');
    });

    it('strips CPF punctuation from the payload on submit', () => {
      setup();
      const httpMock = TestBed.inject(HttpTestingController);

      typeIntoIdentifier('12345678901');
      identifierInput().dispatchEvent(new Event('blur'));
      (fixture.nativeElement.querySelector('#password') as HTMLInputElement).value = 'secret';
      fixture.nativeElement
        .querySelector('#password')
        .dispatchEvent(new Event('input'));
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit'),
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.body.identificador).toBe('12345678901');
      httpMock.verify();
    });

    it('sends a valid e-mail unchanged in the payload on submit', () => {
      setup();
      const httpMock = TestBed.inject(HttpTestingController);

      typeIntoIdentifier('user@example.com');
      (fixture.nativeElement.querySelector('#password') as HTMLInputElement).value = 'secret';
      fixture.nativeElement
        .querySelector('#password')
        .dispatchEvent(new Event('input'));
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit'),
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.body.identificador).toBe('user@example.com');
      httpMock.verify();
    });
  });
});
