import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  // Lote único (limitado a TAMANHO_PAGINA_MAXIMO pelo back; unidadeId é ignorado
  // pelo back) usado onde a tela precisa de todas as turmas de uma unidade de
  // uma vez, como na checagem de conflito de horário.
  listar(unidadeId?: number | null): Observable<Turma[]> {
    let params = new HttpParams().set('page', 0).set('size', TAMANHO_PAGINA_MAXIMO);

    if (unidadeId !== undefined && unidadeId !== null) {
      params = params.set('unidadeId', unidadeId);
    }

    return this.http
      .get<PaginaResposta<TurmaBackend>>(`${this.apiUrl}/todas`, { params })
      .pipe(map((resposta) => resposta.content.map((turma) => this.normalizarTurma(turma))));
  }

  // Paginação de verdade (uma página por vez), usada pela tabela de turmas.
  // O back ignora unidadeId (só pagina) — mandamos mesmo assim para o dia em
  // que passar a filtrar; até lá, quem reforça o filtro é o componente.
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
      const [hora, minuto] = valor;
      return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
    }

    return valor.substring(0, 5);
  }
}
