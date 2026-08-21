import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginRequestDto, LoginResponse } from '../models/auth.model';
import { TokenStorage } from './token-storage';
import { JwtPayload, decodeJwtPayload, isJwtExpired } from '../utils/jwt.util';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorage);

  private readonly token = signal<string | null>(this.readValidToken());

  readonly currentUser = computed<JwtPayload | null>(() => {
    const token = this.token();
    return token ? decodeJwtPayload(token) : null;
  });

  readonly isAuthenticated = computed(() => this.token() !== null);

  login(credentials: LoginRequest, rememberMe: boolean): Observable<LoginResponse> {
    const payload: LoginRequestDto = { email: credentials.email, senha: credentials.password };
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((response) => {
        this.tokenStorage.setToken(response.token, rememberMe);
        this.token.set(response.token);
      }),
    );
  }

  logout(): void {
    this.tokenStorage.clear();
    this.token.set(null);
  }

  getToken(): string | null {
    return this.token();
  }

  private readValidToken(): string | null {
    const token = this.tokenStorage.getToken();
    if (token && isJwtExpired(token)) {
      this.tokenStorage.clear();
      return null;
    }
    return token;
  }
}
