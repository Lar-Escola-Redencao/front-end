import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AtualizarTurmaDTO, CriarTurmaDTO, HoraBackend, Turma } from '../../models/turma.model';

@Injectable({
  providedIn: 'root',
})
export class TurmaService {
  private apiUrl = `${environment.apiUrl}/turmas`;

  constructor(private http: HttpClient) {}

  listar(unidadeId?: number | null): Observable<Turma[]> {
    let params = new HttpParams();

    if (unidadeId !== undefined && unidadeId !== null) {
      params = params.set('unidadeId', unidadeId);
    }

    return this.http
      .get<Turma[]>(`${this.apiUrl}/Listar`, { params })
      .pipe(map((turmas) => turmas.map((turma) => this.normalizarTurma(turma))));
  }

  buscarPorId(id: number): Observable<Turma> {
    return this.http
      .get<Turma>(`${this.apiUrl}/busca/${id}`)
      .pipe(map((turma) => this.normalizarTurma(turma)));
  }

  criar(turma: CriarTurmaDTO): Observable<Turma> {
    return this.http
      .post<Turma>(`${this.apiUrl}/Criar`, this.montarPayload(turma))
      .pipe(map((turma) => this.normalizarTurma(turma)));
  }

  atualizar(id: number, turma: AtualizarTurmaDTO): Observable<Turma> {
    return this.http
      .put<Turma>(`${this.apiUrl}/atualizar/${id}`, this.montarPayload(turma))
      .pipe(map((turma) => this.normalizarTurma(turma)));
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/deletar/${id}`);
  }

  private montarPayload(turma: CriarTurmaDTO): CriarTurmaDTO {
    return {
      periodo: turma.periodo,
      horaInicio: this.paraHoraBackend(turma.horaInicio),
      horaFim: this.paraHoraBackend(turma.horaFim),
      unidadeId: turma.unidadeId,
    };
  }

  private normalizarTurma(turma: Turma): Turma {
    return {
      ...turma,
      horaInicio: this.paraHoraExibicao(turma.horaInicio as unknown as HoraBackend),
      horaFim: this.paraHoraExibicao(turma.horaFim as unknown as HoraBackend),
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
