import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface ConfiguracaoPix {
  chave: string;
  nomeRecebedor: string | null;
  cidadeRecebedor: string;
  valoresSugeridos: number[];
}

export interface CodigoPix {
  identificador: string;
  valor: number;
  chave: string;
  nomeRecebedor: string | null;
  cidadeRecebedor: string;
  copiaECola: string;
  qrCode: string;
  geradoEm: string;
  expiraEm?: string;
  contribuicaoInformada?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PixService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pix`;

  obterConfiguracao() {
    return this.http.get<ConfiguracaoPix>(this.url);
  }
  gerarCodigo(valor: number) {
    return this.http.post<CodigoPix>(`${this.url}/codigo`, { valor });
  }
  enviarAgradecimento(identificador: string, email: string) {
    return this.http.post<void>(`${this.url}/codigo/${encodeURIComponent(identificador)}/agradecimento`, { email });
  }
}
