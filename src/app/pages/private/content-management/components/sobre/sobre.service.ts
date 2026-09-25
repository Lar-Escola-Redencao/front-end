import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import {
  AtualizarSecaoDTO,
  GrupoSecao,
  CriarSecaoDTO,
  ID_PAGINA_SOBRE,
  Pagina,
  PaginaCmsService,
  Secao,
} from 'src/app/shared/services/pagina/pagina-cms.service';

export type { Secao, CriarSecaoDTO, AtualizarSecaoDTO, Pagina, GrupoSecao };

/**
 * Delegador fino pro PaginaCmsService, fixando idPagina = 2 (Sobre).
 * Sem métodos de documento: a página Sobre não tem esse conceito.
 */
@Injectable({ providedIn: 'root' })
export class SobreService {
  constructor(private paginaCmsService: PaginaCmsService) {}

  obterPagina(): Observable<Pagina> {
    return this.paginaCmsService.obterPagina(ID_PAGINA_SOBRE);
  }

  listarSecoes(): Observable<Secao[]> {
    return this.paginaCmsService.listarSecoes(ID_PAGINA_SOBRE);
  }

  listarSecoesAdmin(
    pagina: number,
    tamanho: number,
    sort?: string,
    grupo?: GrupoSecao,
  ): Observable<PaginaResposta<Secao>> {
    return this.paginaCmsService.listarSecoesAdmin(ID_PAGINA_SOBRE, pagina, tamanho, sort, grupo);
  }

  buscarSecao(id: number): Observable<Secao> {
    return this.paginaCmsService.buscarSecao(id);
  }

  criarSecao(dto: CriarSecaoDTO): Observable<Secao> {
    return this.paginaCmsService.criarSecao(ID_PAGINA_SOBRE, dto);
  }

  atualizarSecao(id: number, dto: AtualizarSecaoDTO): Observable<Secao> {
    return this.paginaCmsService.atualizarSecao(id, dto);
  }

  deletarSecao(id: number): Observable<void> {
    return this.paginaCmsService.deletarSecao(id);
  }

  reordenarSecoes(secoes: { id: number; ordem: number }[]): Observable<void> {
    return this.paginaCmsService.reordenarSecoes(secoes);
  }
}
