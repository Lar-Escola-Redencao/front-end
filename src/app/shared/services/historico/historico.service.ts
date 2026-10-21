import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { environment } from 'src/environments/environment';
import {
  FiltrosHistorico,
  AtividadeHistorico,
  LeituraHistorico,
  ResponsavelHistorico,
  HistoricoDetalhe,
  HistoricoEvento,
  TipoRegistroHistorico
} from '../../models/historico.model';
import { PaginaResposta } from '../../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class HistoricoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/historico-alteracoes`;
  readonly leituraAlterada = new Subject<void>();

  atividades(
    tipoRegistro: TipoRegistroHistorico | null,
    pagina: number,
    tamanho: number,
    busca: string,
    filtros: FiltrosHistorico
  ): Observable<PaginaResposta<AtividadeHistorico>> {
    const params = this.parametros(tipoRegistro, filtros)
      .set('page', pagina).set('size', tamanho).set('search', busca.trim());
    return this.http.get<PaginaResposta<AtividadeHistorico>>(`${this.apiUrl}/atividades`, { params });
  }

  responsaveis(): Observable<ResponsavelHistorico[]> {
    return this.http.get<ResponsavelHistorico[]>(`${this.apiUrl}/atividades/responsaveis`);
  }

  consultarLeitura(tipo: TipoRegistroHistorico | null, filtros: FiltrosHistorico): Observable<LeituraHistorico> {
    return this.http.get<LeituraHistorico>(`${this.apiUrl}/atividades/leitura`, {
      params: this.parametros(tipo, filtros)
    });
  }

  marcarLido(tipo: TipoRegistroHistorico | null, filtros: FiltrosHistorico, ultimoEvento: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/atividades/leitura`, { ultimoEvento }, {
      params: this.parametros(tipo, filtros)
    });
  }

  private parametros(tipo: TipoRegistroHistorico | null, filtros: FiltrosHistorico): HttpParams {
    let params = new HttpParams();
    if (tipo) {
      params = params.set('tipoRegistro', tipo);
    }
    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(campo, valor);
      }
    }
    return params;
  }

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
