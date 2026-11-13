import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AtualizarContatoDTO,
  ContatoDetalheDTO,
  ContatoListagemDTO
} from '../../models/contato.model';

import { PaginaResposta } from '../../models/pagina.model';
import { construirHttpParams } from '../../utils/paginacao-url';

@Injectable({ providedIn: 'root' })
export class ContatoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/contatos`;

  listarContatos(pagina: number, tamanho: number, sort?: string, search?: string): Observable<PaginaResposta<ContatoListagemDTO>> {
    const params = construirHttpParams({ pagina, tamanho, sort, extras: { search } });
    return this.http.get<PaginaResposta<ContatoListagemDTO>>(this.apiUrl, { params });
  }

  buscarAutocomplete(termo: string): Observable<ContatoListagemDTO[]> {
    return this.http.get<ContatoListagemDTO[]>(`${this.apiUrl}/buscar`, { params: { termo } });
  }

  buscarDetalhe(id: number): Observable<ContatoDetalheDTO> {
    return this.http.get<ContatoDetalheDTO>(`${this.apiUrl}/${id}`);
  }

  atualizarContato(id: number, dto: AtualizarContatoDTO): Observable<ContatoListagemDTO> {
    return this.http.put<ContatoListagemDTO>(`${this.apiUrl}/${id}`, dto);
  }

  deletarContato(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
