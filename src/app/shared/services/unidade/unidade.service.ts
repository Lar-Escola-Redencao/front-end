import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AtualizarUnidadeDTO, CriarUnidadeDTO, Unidade } from '../../models/unidade.model';
import { PaginaResposta } from '../../models/pagina.model';
import { construirHttpParams, TAMANHO_PAGINA_MAXIMO } from '../../utils/paginacao-url';

@Injectable({
  providedIn: 'root'
})
export class UnidadeService {
  private apiUrl = `${environment.apiUrl}/unidade`;

  constructor(private http: HttpClient) {}

  // Todas as páginas para os selects de filtro/formulário.
  listarTodas(): Observable<Unidade[]> {
    const params = construirHttpParams({ pagina: 0, tamanho: TAMANHO_PAGINA_MAXIMO });
    return this.http
      .get<PaginaResposta<Unidade>>(`${this.apiUrl}/todas`, { params })
      .pipe(
        expand(resposta => resposta.page.number + 1 < resposta.page.totalPages
          ? this.http.get<PaginaResposta<Unidade>>(`${this.apiUrl}/todas`, {
            params: params.set('page', resposta.page.number + 1)
          }) : EMPTY),
        reduce((unidades, resposta) => unidades.concat(resposta.content), [] as Unidade[])
      );
  }

  // Paginação de verdade (uma página por vez), usada pela tabela de unidades.
  listarPaginado(pagina: number, tamanho: number, sort?: string): Observable<PaginaResposta<Unidade>> {
    const params = construirHttpParams({ pagina, tamanho, sort });
    return this.http.get<PaginaResposta<Unidade>>(`${this.apiUrl}/todas`, { params });
  }

  buscarPorId(id: number): Observable<Unidade> {
    return this.http.get<Unidade>(`${this.apiUrl}/${id}`);
  }

  criar(unidade: CriarUnidadeDTO): Observable<Unidade> {
    return this.http.post<Unidade>(`${this.apiUrl}/criar`, this.montarFormData(unidade));
  }

  atualizar(id: number, unidade: AtualizarUnidadeDTO): Observable<Unidade> {
    return this.http.put<Unidade>(`${this.apiUrl}/${id}`, this.montarFormData(unidade));
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private montarFormData(unidade: CriarUnidadeDTO): FormData {
    const formData = new FormData();
    formData.append('nome', unidade.nome);
    formData.append('endereco', unidade.endereco);
    formData.append('telefone', unidade.telefone);
    formData.append('email', unidade.email);
    formData.append('diasFuncionamento', unidade.diasFuncionamento);
    formData.append('horarioAbertura', unidade.horarioAbertura);
    formData.append('horarioFechamento', unidade.horarioFechamento);
    formData.append('idadeMin', unidade.idadeMin.toString());
    formData.append('idadeMax', unidade.idadeMax.toString());
    if (unidade.corHex) formData.append('corHex', unidade.corHex);
    if (unidade.imagem) formData.append('imagem', unidade.imagem);

    return formData;
  }
}
