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

  function setup(initialParams: Record<string, string> = {}): void {
    queryParamMap$ = new BehaviorSubject(convertToParamMap(initialParams));

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
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
  }

  function toastEl(): Element | null {
    return fixture.nativeElement.querySelector('.toast');
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show the session-expired toast on a plain visit to /login', () => {
    setup();

    expect(toastEl()).toBeNull();
  });

  it('shows the session-expired toast when redirected with reason=expired', () => {
    setup({ reason: 'expired' });

    expect(toastEl()?.textContent).toContain('Sua autenticação expirou');
  });

  it('hides the toast when its close button is clicked', () => {
    setup({ reason: 'expired' });

    (toastEl()!.querySelector('.toast-close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(toastEl()).toBeNull();
  });

  it('auto-dismisses the toast after a few seconds', () => {
    vi.useFakeTimers();
    setup({ reason: 'expired' });

    expect(toastEl()).not.toBeNull();

    vi.advanceTimersByTime(6000);
    fixture.detectChanges();

    expect(toastEl()).toBeNull();
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
