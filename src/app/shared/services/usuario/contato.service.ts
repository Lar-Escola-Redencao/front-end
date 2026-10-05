import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
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

  listarOrdenadosPorVinculos(pagina: number, tamanho: number, direcao: 'asc' | 'desc'): Observable<PageResponse<ContatoListagemDTO>> {
    // A contagem não é uma propriedade da entidade Contato: ordena antes de paginar.
    return this.listarContatos(0, 50, 'id,asc').pipe(
      expand(resposta => resposta.page.number + 1 < resposta.page.totalPages
        ? this.listarContatos(resposta.page.number + 1, 50, 'id,asc')
        : EMPTY),
      reduce((contatos, resposta) => contatos.concat(resposta.content), [] as ContatoListagemDTO[]),
      map(contatos => {
        contatos.sort((a, b) => {
          const comparacao = a.quantidadeVinculos - b.quantidadeVinculos;
          return (direcao === 'asc' ? comparacao : -comparacao) || a.id - b.id;
        });
        return {
          content: contatos.slice(pagina * tamanho, (pagina + 1) * tamanho),
          page: { totalElements: contatos.length, totalPages: Math.ceil(contatos.length / tamanho), number: pagina, size: tamanho }
        };
      })
    );
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
