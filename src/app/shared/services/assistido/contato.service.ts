import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ContatoAutocomplete {
  id: number;
  nomeCompleto: string;
  telefone: string;
  email?: string;
  endereco?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContatoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/contatos`;

  buscarContatosAutocomplete(termo: string): Observable<ContatoAutocomplete[]> {
    return this.http.get<ContatoAutocomplete[]>(`${this.apiUrl}/buscar?termo=${encodeURIComponent(termo)}`);
  }
}
