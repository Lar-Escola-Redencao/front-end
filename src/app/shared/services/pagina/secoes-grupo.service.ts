import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import { construirHttpParams } from 'src/app/shared/utils/paginacao-url';
import { CONTRATO_SECOES_GRUPO, GrupoSecao } from './secoes-grupo.contrato';

export interface SecaoGrupo {
  id: number;
  grupo: string | null;
  titulo: string | null;
  conteudo: string | null;
  imagem: string | null;
  ativo: boolean;
}

/**
 * Só os campos que o grupo usa devem vir preenchidos: o que estiver
 * `undefined` não entra no FormData.
 */
export interface SalvarSecaoGrupoDTO {
  grupo: GrupoSecao;
  titulo?: string;
  conteudo?: string;
  imagem?: File;
  ativo?: boolean;
}

const { rotas, camposEnvio, camposResposta, parteArquivo } = CONTRATO_SECOES_GRUPO;

/**
 * Seções das páginas Gráfica e Pix, identificadas pelo campo `grupo`.
 * Rotas e nomes de campos vêm todos de CONTRATO_SECOES_GRUPO.
 */
@Injectable({ providedIn: 'root' })
export class SecoesGrupoService {
  constructor(private http: HttpClient) {}

  /**
   * A rota devolve todas as seções da página (já ordenadas por grupo e ordem);
   * o filtro pelo grupo da aba é feito aqui.
   */
  listarPorGrupo(idPagina: number, grupo: GrupoSecao, search?: string): Observable<SecaoGrupo[]> {
    const params = search ? { search } : undefined;
    return this.http.get<Record<string, any>[]>(rotas.listar(idPagina), { params }).pipe(
      map((resposta) => resposta.map((item) => this.mapearSecao(item))),
      map((secoes) => secoes.filter((secao) => secao.grupo === grupo)),
    );
  }

  listarPorGrupoPaginado(
    idPagina: number,
    grupo: GrupoSecao,
    pagina: number,
    tamanho: number,
    search?: string,
  ): Observable<PaginaResposta<SecaoGrupo>> {
    const params = construirHttpParams({
      pagina, tamanho, sort: 'ordem,asc', extras: { grupo, search },
    }).append('sort', 'id,asc');

    return this.http.get<PaginaResposta<Record<string, any>>>(rotas.listarPaginado(idPagina), { params }).pipe(
      map((resposta) => ({
        content: resposta.content.map((item) => this.mapearSecao(item)),
        page: resposta.page,
      })),
    );
  }

  criar(idPagina: number, dto: SalvarSecaoGrupoDTO): Observable<SecaoGrupo> {
    return this.http
      .post<Record<string, any>>(rotas.criar(idPagina), this.montarFormData(dto))
      .pipe(map((resposta) => this.mapearSecao(resposta)));
  }

  atualizar(idPagina: number, id: number, dto: SalvarSecaoGrupoDTO): Observable<SecaoGrupo> {
    return this.http
      .put<Record<string, any>>(rotas.atualizar(idPagina, id), this.montarFormData(dto))
      .pipe(map((resposta) => this.mapearSecao(resposta)));
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(rotas.excluir(id));
  }

  /**
   * Sem Content-Type manual: o navegador precisa gerar o boundary do multipart.
   * Sem arquivo novo, a parte do arquivo não vai e o back mantém a imagem atual.
   */
  private montarFormData(dto: SalvarSecaoGrupoDTO): FormData {
    const formData = new FormData();

    if (dto.titulo !== undefined) {
      formData.append(camposEnvio.titulo, dto.titulo);
    }

    if (dto.conteudo !== undefined) {
      formData.append(camposEnvio.conteudo, dto.conteudo);
    }

    formData.append(camposEnvio.grupo, dto.grupo);

    if (dto.ativo !== undefined) {
      formData.append(camposEnvio.ativo, String(dto.ativo));
    }

    if (dto.imagem) {
      formData.append(parteArquivo, dto.imagem);
    }

    return formData;
  }

  private mapearSecao(item: Record<string, any>): SecaoGrupo {
    return {
      id: Number(item[camposResposta.id]),
      grupo: item[camposResposta.grupo] ?? null,
      titulo: item[camposResposta.titulo] ?? null,
      conteudo: item[camposResposta.conteudo] ?? null,
      imagem: item[camposResposta.imagem] ?? null,
      ativo: item[camposResposta.ativo] ?? true,
    };
  }
}
