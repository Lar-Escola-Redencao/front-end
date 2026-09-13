import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import { construirHttpParams } from 'src/app/shared/utils/paginacao-url';

export interface Secao {
  id: number;
  titulo: string;
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
}

export interface AtualizarSecaoDTO {
  titulo: string;
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

@Injectable({ providedIn: 'root' })
export class TransparenciaService {
  private apiUrl = `${environment.apiUrl}/transparencia`;

  constructor(private http: HttpClient) { }

  obterPagina(): Observable<Pagina> {
    return this.http.get<Pagina>(`${this.apiUrl}`);
  }

  /** Rota pública, sem paginação — hoje não é usada pela tela admin. */
  listarSecoes(): Observable<Secao[]> {
    return this.http.get<Secao[]>(`${this.apiUrl}/secoes`);
  }

  /** Rota autenticada e paginada, usada pela tabela de seções da tela admin. */
  listarSecoesAdmin(pagina: number, tamanho: number, sort?: string): Observable<PaginaResposta<Secao>> {
    const params = construirHttpParams({ pagina, tamanho, sort });
    return this.http.get<PaginaResposta<Secao>>(`${this.apiUrl}/secoes/admin`, { params });
  }

  /** Rota autenticada e paginada, usada pela tabela de documentos da tela admin. */
  listarDocumentosAdmin(pagina: number, tamanho: number, sort?: string): Observable<PaginaResposta<DocumentoAdmin>> {
    const params = construirHttpParams({ pagina, tamanho, sort });
    return this.http.get<PaginaResposta<DocumentoAdmin>>(`${this.apiUrl}/documentos/admin`, { params });
  }

  buscarSecao(id: number): Observable<Secao> {
    return this.http.get<Secao>(`${this.apiUrl}/secao/${id}`);
  }

  criarSecao(dto: CriarSecaoDTO): Observable<Secao> {
    const formData = new FormData();
    formData.append('titulo', dto.titulo);
    return this.http.post<Secao>(`${this.apiUrl}/criar-secao`, formData);
  }

  atualizarSecao(id: number, dto: AtualizarSecaoDTO): Observable<Secao> {
    const formData = new FormData();

    formData.append('titulo', dto.titulo);
    formData.append('ativo', dto.ativo.toString());

    return this.http.put<Secao>(
      `${this.apiUrl}/secao/${id}`,
      formData
    );
  }

  deletarSecao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/secao/${id}`);
  }

  adicionarDocumento(secaoId: number, titulo: string, arquivo: File): Observable<Documento> {
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('arquivo', arquivo);
    return this.http.post<Documento>(`${this.apiUrl}/secao/${secaoId}/upload-documento`, formData);
  }

  atualizarDocumento(id: number, secaoId: number, titulo: string, arquivo?: File): Observable<Documento> {
    const formData = new FormData();
    formData.append('secaoId', secaoId.toString());
    formData.append('titulo', titulo);

    if (arquivo) {
      formData.append('arquivo', arquivo);
    }

    return this.http.put<Documento>(`${this.apiUrl}/documento/${id}`, formData);
  }

  baixarDocumento(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documento/${id}/download`, {
      responseType: 'blob'
    });
  }

  deletarDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documento/${id}`);
  }
}