import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface RecuperacaoSenhaResposta {
  retryAfterSeconds: number;
  tentativas: number;
}

@Injectable({ providedIn: 'root' })
export class RecuperacaoSenhaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  solicitarRecuperacao(email: string, captchaToken: string): Promise<RecuperacaoSenhaResposta> {
    return firstValueFrom(this.http.post<RecuperacaoSenhaResposta>(`${this.baseUrl}/esqueci-minha-senha`, { email, captchaToken }));
  }

  validarCodigo(token: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/validar-codigo`, { token }));
  }

  redefinirSenha(token: string, novaSenha: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/redefinir-senha`, { token, novaSenha }));
  }
}
