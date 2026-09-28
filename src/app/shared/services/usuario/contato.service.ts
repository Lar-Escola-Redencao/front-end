import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AtualizarContatoDTO,
  ContatoDetalheDTO,
  ContatoListagemDTO
} from '../../models/contato.model';

interface PageResponse<T> {
  content: T[];
  page: { totalElements: number; totalPages: number; number: number; size: number };
}

@Injectable({ providedIn: 'root' })
export class ContatoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/contatos`;

  listarContatos(pagina: number, tamanho: number, sort?: string): Observable<PageResponse<ContatoListagemDTO>> {
    let params = new HttpParams().set('page', pagina).set('size', tamanho);
    if (sort) params = params.set('sort', sort);
    return this.http.get<PageResponse<ContatoListagemDTO>>(this.apiUrl, { params });
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
