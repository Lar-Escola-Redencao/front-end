import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import {
  AtualizarSecaoDTO,
  CriarSecaoDTO,
  Documento,
  DocumentoAdmin,
  ID_PAGINA_TRANSPARENCIA,
  Pagina,
  PaginaCmsService,
  Secao,
} from 'src/app/shared/services/pagina/pagina-cms.service';

export type { Secao, DocumentoAdmin, CriarSecaoDTO, AtualizarSecaoDTO, Documento, Pagina };

/**
 * Delegador fino pro PaginaCmsService, fixando idPagina = 1 (Transparência).
 * A assinatura pública é a mesma de antes da migração pra /paginas, então
 * transparencia.ts e transparencia.html não precisam mudar.
 */
@Injectable({ providedIn: 'root' })
export class TransparenciaService {
  constructor(private paginaCmsService: PaginaCmsService) {}

  obterPagina(): Observable<Pagina> {
    return this.paginaCmsService.obterPagina(ID_PAGINA_TRANSPARENCIA);
  }

  /** Rota pública, sem paginação — hoje não é usada pela tela admin. */
  listarSecoes(): Observable<Secao[]> {
    return this.paginaCmsService.listarSecoes(ID_PAGINA_TRANSPARENCIA);
  }

  /** Rota autenticada e paginada, usada pela tabela de seções da tela admin. */
  listarSecoesAdmin(pagina: number, tamanho: number, sort?: string): Observable<PaginaResposta<Secao>> {
    return this.paginaCmsService.listarSecoesAdmin(ID_PAGINA_TRANSPARENCIA, pagina, tamanho, sort);
  }

  /** Rota autenticada e paginada, usada pela tabela de documentos da tela admin. */
  listarDocumentosAdmin(pagina: number, tamanho: number, sort?: string): Observable<PaginaResposta<DocumentoAdmin>> {
    return this.paginaCmsService.listarDocumentosAdmin(ID_PAGINA_TRANSPARENCIA, pagina, tamanho, sort);
  }

  buscarSecao(id: number): Observable<Secao> {
    return this.paginaCmsService.buscarSecao(id);
  }

  criarSecao(dto: CriarSecaoDTO): Observable<Secao> {
    return this.paginaCmsService.criarSecao(ID_PAGINA_TRANSPARENCIA, dto);
  }

  atualizarSecao(id: number, dto: AtualizarSecaoDTO): Observable<Secao> {
    return this.paginaCmsService.atualizarSecao(id, dto);
  }

  deletarSecao(id: number): Observable<void> {
    return this.paginaCmsService.deletarSecao(id);
  }

  adicionarDocumento(secaoId: number, titulo: string, arquivo: File): Observable<Documento> {
    return this.paginaCmsService.adicionarDocumento(secaoId, titulo, arquivo);
  }

  atualizarDocumento(id: number, secaoId: number, titulo: string, arquivo?: File): Observable<Documento> {
    return this.paginaCmsService.atualizarDocumento(id, secaoId, titulo, arquivo);
  }

  baixarDocumento(id: number): Observable<Blob> {
    return this.paginaCmsService.baixarDocumento(id);
  }

  deletarDocumento(id: number): Observable<void> {
    return this.paginaCmsService.deletarDocumento(id);
  }
}
