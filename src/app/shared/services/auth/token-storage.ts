import { Injectable } from '@angular/core';

const TOKEN_KEY = 'ler_auth_token';

/**
 * Centralizes where the JWT lives so the rest of the app never touches
 * Web Storage directly. The token is kept in sessionStorage by default
 * (wiped when the tab closes) and only promoted to localStorage when the
 * user opts in via "Lembre de mim", trading a longer-lived session for a
 * larger XSS exposure window only when the user explicitly asks for it.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenStorage {
  setToken(token: string, remember: boolean): void {
    this.clear();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  }

  clear(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}
