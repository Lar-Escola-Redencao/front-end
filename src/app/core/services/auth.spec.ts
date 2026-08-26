import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Auth } from './auth';

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildToken(payload: unknown): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

const TOKEN_KEY = 'ler_auth_token';

describe('Auth', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.useRealTimers();
  });

  function createService(): Auth {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideRouter([])],
    });
    return TestBed.inject(Auth);
  }

  it('loads a valid stored token as authenticated', () => {
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });
    sessionStorage.setItem(TOKEN_KEY, token);

    const auth = createService();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.consumeExpiredSessionFlag()).toBe(false);
  });

  it('drops an expired stored token and flags the session as expired', () => {
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 3600 });
    sessionStorage.setItem(TOKEN_KEY, token);

    const auth = createService();

    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(auth.consumeExpiredSessionFlag()).toBe(true);
    // the flag is consumed, not sticky
    expect(auth.consumeExpiredSessionFlag()).toBe(false);
  });

  it('drops a tampered stored token (undecodable payload) and flags the session as expired', () => {
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });
    const [header, , signature] = token.split('.');
    sessionStorage.setItem(TOKEN_KEY, `${header}.not-a-valid-payload!!!.${signature}`);

    const auth = createService();

    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(auth.consumeExpiredSessionFlag()).toBe(true);
  });

  it('does not flag an expired session when there was never a stored token', () => {
    const auth = createService();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.consumeExpiredSessionFlag()).toBe(false);
  });

  it('stores the token and authenticates on successful login', () => {
    const auth = createService();
    const httpMock = TestBed.inject(HttpTestingController);

    auth.login({ email: 'a@b.com', password: 'secret' }, false).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({ email: 'a@b.com', senha: 'secret', lembrarMe: false });
    const token = buildToken({ sub: 'a@b.com', exp: Math.floor(Date.now() / 1000) + 3600 });
    req.flush({ token });

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getToken()).toBe(token);

    httpMock.verify();
  });

  it('clears the token on logout', () => {
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });
    sessionStorage.setItem(TOKEN_KEY, token);
    const auth = createService();

    auth.logout();

    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('sends lembrarMe=true to the backend when "Lembre de mim" was checked', () => {
    const auth = createService();
    const httpMock = TestBed.inject(HttpTestingController);

    auth.login({ email: 'a@b.com', password: 'secret' }, true).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({ email: 'a@b.com', senha: 'secret', lembrarMe: true });
    req.flush({ token: buildToken({ sub: 'a@b.com', exp: Math.floor(Date.now() / 1000) + 3600 }) });

    httpMock.verify();
  });

  it('logs out on its own the moment a stored token expires, even with no reload or API call', () => {
    vi.useFakeTimers();
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 4 });
    sessionStorage.setItem(TOKEN_KEY, token);
    const auth = createService();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    expect(auth.isAuthenticated()).toBe(true);

    vi.advanceTimersByTime(4000);

    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'expired' } });
  });

  it('logs out on its own when a freshly-logged-in token expires', () => {
    vi.useFakeTimers();
    const auth = createService();
    const httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    auth.login({ email: 'a@b.com', password: 'secret' }, false).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    const token = buildToken({ sub: 'a@b.com', exp: Math.floor(Date.now() / 1000) + 60 });
    req.flush({ token });

    expect(auth.isAuthenticated()).toBe(true);

    vi.advanceTimersByTime(60_000);

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'expired' } });

    httpMock.verify();
  });

  it('does not fire the expiry navigation after a manual logout', () => {
    vi.useFakeTimers();
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 4 });
    sessionStorage.setItem(TOKEN_KEY, token);
    const auth = createService();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    auth.logout();
    vi.advanceTimersByTime(10_000);

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
