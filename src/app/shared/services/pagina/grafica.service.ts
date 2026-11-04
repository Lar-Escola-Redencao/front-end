import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ID_PAGINA_GRAFICA, PaginaCmsService, Secao } from './pagina-cms.service';

export type { Secao };

/**
 * Delegador fino pro PaginaCmsService, fixando idPagina = 3 (Gráfica).
 */
@Injectable({ providedIn: 'root' })
export class GraficaService {
  constructor(private paginaCmsService: PaginaCmsService) {}

  listarSecoes(): Observable<Secao[]> {
    return this.paginaCmsService.listarSecoes(ID_PAGINA_GRAFICA);
  }
}
