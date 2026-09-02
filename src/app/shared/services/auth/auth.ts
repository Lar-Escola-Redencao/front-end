import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { LoginRequest, LoginRequestDto, LoginResponse } from '../../models/auth.model';
import { JwtPayload, decodeJwtPayload, isJwtInvalid } from '../../utils/jwt.util';
import { TokenStorage } from './token-storage';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorage);
  private readonly router = inject(Router);

  /**
   * Set when a stored token is dropped for being expired/invalid, so a redirect to /login can
   * explain why. Must be declared before `token` below — its initializer runs `readValidToken()`,
   * which writes this flag, and field initializers run in declaration order.
   */
  private expiredOnLoad = false;

  private readonly token = signal<string | null>(this.readValidToken());

  /**
   * Fires exactly at the token's `exp`, so a session expiring while the tab is sitting idle on
   * an authenticated page (no reload, no API call) still logs the user out instead of leaving a
   * stale "authenticated" screen up until the next navigation or request.
   */
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  readonly currentUser = computed<JwtPayload | null>(() => {
    const token = this.token();
    return token ? decodeJwtPayload(token) : null;
  });

  readonly isAuthenticated = computed(() => this.token() !== null);

  constructor() {
    this.scheduleExpiry(this.token());
  }

  login(credentials: LoginRequest, rememberMe: boolean): Observable<LoginResponse> {
    const payload: LoginRequestDto = {
      identificador: credentials.identifier,
      senha: credentials.password,
      lembrarMe: rememberMe,
    };
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((response) => {
        this.tokenStorage.setToken(response.token);
        this.token.set(response.token);
        this.scheduleExpiry(response.token);
      }),
    );
  }

  logout(): void {
    this.clearExpiryTimer();
    this.tokenStorage.clear();
    this.token.set(null);
  }

  getToken(): string | null {
    return this.token();
  }

  /** Reads and clears the "a stored token was dropped as expired/invalid" flag. */
  consumeExpiredSessionFlag(): boolean {
    const value = this.expiredOnLoad;
    this.expiredOnLoad = false;
    return value;
  }

  private readValidToken(): string | null {
    const token = this.tokenStorage.getToken();
    if (token && isJwtInvalid(token)) {
      this.tokenStorage.clear();
      this.expiredOnLoad = true;
      return null;
    }
    return token;
  }

  private scheduleExpiry(token: string | null): void {
    this.clearExpiryTimer();
    const exp = token ? decodeJwtPayload(token)?.exp : undefined;
    if (!exp) {
      return;
    }

    const msUntilExpiry = exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      return;
    }
    this.expiryTimer = setTimeout(() => this.handleExpiry(), msUntilExpiry);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== undefined) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = undefined;
    }
  }

  private handleExpiry(): void {
    this.expiryTimer = undefined;
    this.tokenStorage.clear();
    this.token.set(null);
    this.router.navigate(['/entrar'], { queryParams: { reason: 'expired' } });
  }
}
