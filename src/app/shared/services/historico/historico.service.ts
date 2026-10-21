import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import {
  FiltrosHistorico,
  HistoricoDetalhe,
  HistoricoEvento,
  TipoRegistroHistorico
} from '../../models/historico.model';
import { PaginaResposta } from '../../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class HistoricoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/historico-alteracoes`;

  listar(
    tipoRegistro: TipoRegistroHistorico,
    pagina: number,
    tamanho: number,
    busca: string,
    filtros: FiltrosHistorico
  ): Observable<PaginaResposta<HistoricoEvento>> {
    let params = new HttpParams()
      .set('tipoRegistro', tipoRegistro)
      .set('page', pagina)
      .set('size', tamanho);

    if (busca.trim()) {
      params = params.set('search', busca.trim());
    }

    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(campo, valor);
      }
    }

    return this.http.get<PaginaResposta<HistoricoEvento>>(this.apiUrl, { params });
  }

  detalhar(id: number): Observable<HistoricoDetalhe> {
    return this.http.get<HistoricoDetalhe>(`${this.apiUrl}/${id}`);
  }
}
