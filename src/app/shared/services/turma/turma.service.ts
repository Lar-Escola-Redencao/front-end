import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AtualizarTurmaDTO,
  CriarTurmaDTO,
  HoraBackend,
  Turma,
  TurmaBackend,
} from '../../models/turma.model';
import { PaginaResposta } from '../../models/pagina.model';
import { construirHttpParams, TAMANHO_PAGINA_MAXIMO } from '../../utils/paginacao-url';

@Injectable({
  providedIn: 'root',
})
export class TurmaService {
  private apiUrl = `${environment.apiUrl}/turmas`;

  constructor(private http: HttpClient) {}

  // Carrega todas as páginas para os selects e a checagem de horários.
  listar(unidadeId?: number | null): Observable<Turma[]> {
    let params = new HttpParams().set('page', 0).set('size', TAMANHO_PAGINA_MAXIMO);

    if (unidadeId !== undefined && unidadeId !== null) {
      params = params.set('unidadeId', unidadeId);
    }

    return this.http
      .get<PaginaResposta<TurmaBackend>>(`${this.apiUrl}/todas`, { params })
      .pipe(
        expand(resposta => resposta.page.number + 1 < resposta.page.totalPages
          ? this.http.get<PaginaResposta<TurmaBackend>>(`${this.apiUrl}/todas`, {
            params: params.set('page', resposta.page.number + 1)
          }) : EMPTY),
        reduce((turmas, resposta) => turmas.concat(resposta.content.map(turma => this.normalizarTurma(turma))), [] as Turma[])
      );
  }

  // Paginação de verdade (uma página por vez), usada pela tabela de turmas.
  // O back aplica o filtro unidadeId antes de paginar.
  listarPaginado(
    pagina: number,
    tamanho: number,
    unidadeId?: number | null,
  ): Observable<PaginaResposta<Turma>> {
    let params = construirHttpParams({ pagina, tamanho });

    if (unidadeId !== undefined && unidadeId !== null) {
      params = params.set('unidadeId', unidadeId);
    }

    return this.http.get<PaginaResposta<TurmaBackend>>(`${this.apiUrl}/todas`, { params }).pipe(
      map((resposta) => ({
        content: resposta.content.map((turma) => this.normalizarTurma(turma)),
        page: resposta.page,
      })),
    );
  }

  buscarPorId(id: number): Observable<Turma> {
    return this.http
      .get<TurmaBackend>(`${this.apiUrl}/${id}`)
      .pipe(map((turma) => this.normalizarTurma(turma)));
  }

  criar(turma: CriarTurmaDTO): Observable<Turma> {
    return this.http
      .post<TurmaBackend>(`${this.apiUrl}/criar`, this.montarPayload(turma))
      .pipe(map((turma) => this.normalizarTurma(turma)));
  }

  atualizar(id: number, turma: AtualizarTurmaDTO): Observable<Turma> {
    return this.http
      .put<TurmaBackend>(`${this.apiUrl}/${id}`, this.montarPayload(turma))
      .pipe(map((turma) => this.normalizarTurma(turma)));
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private montarPayload(turma: CriarTurmaDTO): CriarTurmaDTO {
    return {
      periodo: turma.periodo,
      horaInicio: this.paraHoraBackend(turma.horaInicio),
      horaFim: this.paraHoraBackend(turma.horaFim),
      unidadeId: turma.unidadeId,
    };
  }

  private normalizarTurma(turma: TurmaBackend): Turma {
    return {
      id: turma.id,
      periodo: turma.periodo,
      horaInicio: this.paraHoraExibicao(turma.horaInicio),
      horaFim: this.paraHoraExibicao(turma.horaFim),
      unidade: { id: turma.unidadeId, nome: turma.unidadeNome },
    };
  }

  private paraHoraBackend(valor: string): string {
    return valor && valor.length === 5 ? `${valor}:00` : valor;
  }

  private paraHoraExibicao(valor: HoraBackend | null | undefined): string {
    if (!valor) {
      return '';
    }

    if (Array.isArray(valor)) {
      const [hora, minuto, segundo = 0] = valor;
      return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}${segundo ? ':' + String(segundo).padStart(2, '0') : ''}`;
    }

    return valor.substring(6, 8) === '00' ? valor.substring(0, 5) : valor;
  }
}
