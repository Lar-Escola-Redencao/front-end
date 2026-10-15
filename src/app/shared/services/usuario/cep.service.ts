import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

export interface EnderecoCep {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  private readonly http = inject(HttpClient);

  consultar(cep: string): Observable<EnderecoCep> {
    return this.http.get<EnderecoCep>(`https://viacep.com.br/ws/${cep}/json/`).pipe(timeout(10000));
  }
}
