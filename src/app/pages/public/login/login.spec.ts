import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

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
});
