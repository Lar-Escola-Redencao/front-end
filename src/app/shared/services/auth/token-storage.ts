import { Injectable } from '@angular/core';

const TOKEN_KEY = 'ler_auth_token';

/**
 * Centralizes where the JWT lives so the rest of the app never touches Web Storage directly.
 * Always uses localStorage so a session started in one tab is recognized by every other tab of
 * the same browser; "Lembre de mim" only controls how long the token itself stays valid (its
 * `exp` claim, set by the backend), not where it's stored.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenStorage {
  setToken(token: string): void {
    this.clear();
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    // Also drop any leftover token from before the storage was unified onto localStorage.
    sessionStorage.removeItem(TOKEN_KEY);
  }
}
