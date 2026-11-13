import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AtualizarColaboradorDTO,
  Colaborador,
  CriarColaboradorDTO,
  ReativarColaboradorDTO
} from '../../models/colaborador.model';
import { PaginaResposta } from '../../models/pagina.model';
import { construirHttpParams } from '../../utils/paginacao-url';

@Injectable({
  providedIn: 'root'
})
export class ColaboradorService {
  private apiUrl = `${environment.apiUrl}/membro`;

  constructor(private http: HttpClient) {}

  listarTodos(
    pagina: number,
    tamanho: number,
    sort?: string,
    idPapel?: number | null,
    idUnidade?: number | null,
    search?: string,
    ativo?: boolean | null
  ): Observable<PaginaResposta<Colaborador>> {
    const params = construirHttpParams({
      pagina,
      tamanho,
      sort,
      extras: {
        idPapel: idPapel ?? undefined,
        idUnidade: idUnidade ?? undefined,
        search,
        ativo: ativo === null || ativo === undefined ? undefined : String(ativo)
      }
    });
    return this.http.get<PaginaResposta<Colaborador>>(`${this.apiUrl}/todos`, { params });
  }

  buscarPorId(id: number): Observable<Colaborador> {
    return this.http.get<Colaborador>(`${this.apiUrl}/${id}`);
  }

  criar(colaborador: CriarColaboradorDTO): Observable<Colaborador> {
    return this.http.post<Colaborador>(`${this.apiUrl}/criar`, colaborador);
  }

  atualizar(id: number, colaborador: AtualizarColaboradorDTO): Observable<Colaborador> {
    return this.http.put<Colaborador>(`${this.apiUrl}/${id}`, colaborador);
  }

  desativar(id: number): Observable<Colaborador> {
    return this.http.put<Colaborador>(`${this.apiUrl}/${id}/desativar`, {});
  }

  reativar(id: number, dados: ReativarColaboradorDTO): Observable<Colaborador> {
    return this.http.put<Colaborador>(`${this.apiUrl}/${id}/reativar`, dados);
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
