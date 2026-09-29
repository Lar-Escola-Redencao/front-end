import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Auth } from '../services/auth/auth';
import { authInterceptor } from './auth-interceptor';

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildToken(payload: unknown): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authStub: { getToken: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authStub = {
      getToken: vi.fn(),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Auth, useValue: authStub },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  it('attaches the bearer token to API requests when authenticated', () => {
    authStub.getToken.mockReturnValue('a-token');

    http.get(`${environment.apiUrl}/backoffice/data`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/backoffice/data`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer a-token');
    req.flush({});
  });

  it('logs out and redirects with reason=expired on a 401 for an authenticated request if the token is expired', () => {
    const expiredToken = buildToken({ exp: Math.floor(Date.now() / 1000) - 1000 });
    authStub.getToken.mockReturnValue(expiredToken);

    http.get(`${environment.apiUrl}/backoffice/data`).subscribe({ error: () => {} });

    httpMock.expectOne(`${environment.apiUrl}/backoffice/data`).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authStub.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/entrar'], {
      queryParams: { reason: 'expired' },
    });
  });

  it('logs out and redirects with reason=invalid on a 401 for an authenticated request if the token is tampered/invalid', () => {
    const tamperedToken = buildToken({ role: 'ADMINISTRADOR', exp: Math.floor(Date.now() / 1000) + 1000 });
    authStub.getToken.mockReturnValue(tamperedToken);

    http.get(`${environment.apiUrl}/backoffice/data`).subscribe({ error: () => {} });

    httpMock.expectOne(`${environment.apiUrl}/backoffice/data`).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authStub.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/entrar'], {
      queryParams: { reason: 'invalid' },
    });
  });

  it('does not treat a 401 on an unauthenticated request (e.g. wrong-password login) as a session expiry', () => {
    authStub.getToken.mockReturnValue(null);

    http.post(`${environment.apiUrl}/auth/login`, { email: 'a@b.com', senha: 'wrong' }).subscribe({
      error: () => {},
    });

    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authStub.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});