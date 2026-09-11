import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RecuperacaoSenhaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  solicitarRecuperacao(email: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/esqueci-minha-senha`, { email }));
  }

  validarCodigo(token: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/validar-codigo`, { token }));
  }

  redefinirSenha(token: string, novaSenha: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/redefinir-senha`, { token, novaSenha }));
  }
}