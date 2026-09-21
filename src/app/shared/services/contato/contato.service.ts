import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'; // <-- Essencial para o Observable funcionar aqui
import { environment } from 'src/environments/environment';
import { ContatoListagemDTO } from '../../models/contato.model';
import { PaginaResposta } from '../../models/pagina.model';
import { construirHttpParams } from '../../utils/paginacao-url';

@Injectable({ providedIn: 'root' })
export class ContatoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/contatos`;

  buscarAutocomplete(termo: string): Observable<ContatoListagemDTO[]> {
    return this.http.get<ContatoListagemDTO[]>(`${this.apiUrl}/buscar`, { params: { termo } });
  }

  listarContatos(pagina: number, tamanho: number, sort?: string): Observable<PaginaResposta<ContatoListagemDTO>> {
    const params = construirHttpParams({ pagina, tamanho, sort });
    return this.http.get<PaginaResposta<ContatoListagemDTO>>(this.apiUrl, { params });
  }

  atualizarContato(id: number, dto: { telefone?: string; email?: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto);
  }

  deletarContato(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
