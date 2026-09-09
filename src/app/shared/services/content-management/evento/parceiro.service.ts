import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import { construirHttpParams, TAMANHO_PAGINA_MAXIMO } from 'src/app/shared/utils/paginacao-url';

@Injectable({
  providedIn: 'root'
})
export class ParceiroService {
  constructor(private http: HttpClient) {}

  /**
   * Usado só para popular o checklist de parceiros no formulário de evento
   * (não é uma tela de listagem paginada) — por isso busca uma única página
   * grande em vez de expor paginação aqui.
   */
  listarTodos(): Observable<{ id: number; nome: string; logo: string }[]> {
    const params = construirHttpParams({ pagina: 0, tamanho: TAMANHO_PAGINA_MAXIMO });
    return this.http
      .get<PaginaResposta<{ id: number; nome: string; logo: string }>>(`${environment.apiUrl}/parceiro/todos`, { params })
      .pipe(map(resposta => resposta.content));
  }
}
