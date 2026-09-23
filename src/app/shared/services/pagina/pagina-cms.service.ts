import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import { construirHttpParams } from 'src/app/shared/utils/paginacao-url';

/** Ids fixos das páginas institucionais cadastradas no banco. */
export const ID_PAGINA_TRANSPARENCIA = 1;
export const ID_PAGINA_SOBRE = 2;

/** Recorte opcional da listagem paginada de seções, espelhando o enum TipoSecao do back. */
export type TipoSecao = 'HISTORIA';

export interface Secao {
  id: number;
  titulo: string;
  conteudo?: string;
  imagem?: string;
  ativo: boolean;
}

export interface DocumentoAdmin {
  id: number;
  titulo: string;
  arquivo: string;
  secaoId: number;
  secaoTitulo: string;
}

export interface CriarSecaoDTO {
  titulo: string;
  conteudo?: string;
  imagem?: File;
  ativo?: boolean;
}

export interface AtualizarSecaoDTO {
  titulo: string;
  conteudo?: string;
  imagem?: File;
  ativo: boolean;
}

export interface Documento {
  id: number;
  titulo: string;
  arquivo: string;
}

export interface Pagina {
  // Ajuste os campos conforme a sua entidade Pagina no backend, se necessário
  [key: string]: any;
}

/**
 * Consumo genérico do PaginaController: recebe idPagina em todo método de
 * listagem/criação e não sabe qual página institucional está manipulando.
 * TransparenciaService e SobreService delegam pra cá fixando o próprio id.
 */
@Injectable({ providedIn: 'root' })
export class PaginaCmsService {
  private apiUrl = `${environment.apiUrl}/paginas`;

  constructor(private http: HttpClient) {}

  obterPagina(idPagina: number): Observable<Pagina> {
    return this.http.get<Pagina>(`${this.apiUrl}/${idPagina}`);
  }

  /** Rota pública, sem paginação. */
  listarSecoes(idPagina: number): Observable<Secao[]> {
    return this.http.get<Secao[]>(`${this.apiUrl}/${idPagina}/secoes`);
  }

  /**
   * Rota autenticada e paginada, filtrada pela página. Com `tipo`, o back
   * pagina e conta só as seções daquele recorte — sem ele, vêm todas.
   */
  listarSecoesAdmin(
    idPagina: number,
    pagina: number,
    tamanho: number,
    sort?: string,
    tipo?: TipoSecao,
  ): Observable<PaginaResposta<Secao>> {
    const params = construirHttpParams({ pagina, tamanho, sort, extras: { tipo } });
    return this.http.get<PaginaResposta<Secao>>(`${this.apiUrl}/${idPagina}/secoes/admin`, { params });
  }

  /** Rota autenticada e paginada, filtrada pela página. */
  listarDocumentosAdmin(
    idPagina: number,
    pagina: number,
    tamanho: number,
    sort?: string,
  ): Observable<PaginaResposta<DocumentoAdmin>> {
    const params = construirHttpParams({ pagina, tamanho, sort });
    return this.http.get<PaginaResposta<DocumentoAdmin>>(`${this.apiUrl}/${idPagina}/documentos/admin`, { params });
  }

  /** Seção e documento são buscados pelo próprio id, sem precisar de idPagina. */
  buscarSecao(id: number): Observable<Secao> {
    return this.http.get<Secao>(`${this.apiUrl}/secoes/${id}`);
  }

  criarSecao(idPagina: number, dto: CriarSecaoDTO): Observable<Secao> {
    const formData = new FormData();
    formData.append('titulo', dto.titulo);

    // Só manda conteudo quando tem texto de verdade, pra não gravar ''
    // no banco logo na criação do registro.
    if (dto.conteudo && dto.conteudo.trim()) {
      formData.append('conteudo', dto.conteudo);
    }

    if (dto.ativo !== undefined) {
      formData.append('ativo', String(dto.ativo));
    }

    if (dto.imagem) {
      formData.append('imagem', dto.imagem);
    }

    return this.http.post<Secao>(`${this.apiUrl}/${idPagina}/secoes`, formData);
  }

  atualizarSecao(id: number, dto: AtualizarSecaoDTO): Observable<Secao> {
    const formData = new FormData();
    formData.append('titulo', dto.titulo);
    formData.append('ativo', String(dto.ativo));

    // Ao contrário do criar, aqui sempre manda o campo — mesmo vazio —
    // senão o usuário nunca consegue apagar uma descrição já salva.
    // Combinado com o back: string vazia/em branco vira NULL na atualização.
    formData.append('conteudo', dto.conteudo ?? '');

    if (dto.imagem) {
      formData.append('imagem', dto.imagem);
    }

    return this.http.put<Secao>(`${this.apiUrl}/secoes/${id}`, formData);
  }

  /** Endpoint dedicado pra trocar só a imagem, sem reenviar titulo/conteudo/ativo. */
  atualizarImagemSecao(id: number, imagem: File): Observable<Secao> {
    const formData = new FormData();
    formData.append('imagem', imagem);
    return this.http.put<Secao>(`${this.apiUrl}/secoes/${id}/imagem`, formData);
  }

  deletarSecao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/secoes/${id}`);
  }

  adicionarDocumento(secaoId: number, titulo: string, arquivo: File): Observable<Documento> {
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('arquivo', arquivo);
    return this.http.post<Documento>(`${this.apiUrl}/secoes/${secaoId}/documentos`, formData);
  }

  atualizarDocumento(id: number, secaoId: number, titulo: string, arquivo?: File): Observable<Documento> {
    const formData = new FormData();
    formData.append('secaoId', secaoId.toString());
    formData.append('titulo', titulo);

    if (arquivo) {
      formData.append('arquivo', arquivo);
    }

    return this.http.put<Documento>(`${this.apiUrl}/documentos/${id}`, formData);
  }

  baixarDocumento(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/${id}/download`, {
      responseType: 'blob',
    });
  }

  deletarDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documentos/${id}`);
  }
}
