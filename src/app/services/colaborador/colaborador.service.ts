import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AtualizarColaboradorDTO, Colaborador, CriarColaboradorDTO } from 'src/app/models/membro.model';

@Injectable({
  providedIn: 'root'
})
export class ColaboradorService {
  private apiUrl = `${environment.apiUrl}/colaborador`;

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Colaborador[]> {
    return this.http.get<Colaborador[]>(`${this.apiUrl}/todos`);
  }

  buscarPorId(id: number): Observable<Colaborador> {
    return this.http.get<Colaborador>(`${this.apiUrl}/${id}`);
  }

  criar(colaborador: CriarColaboradorDTO): Observable<Colaborador> {
    return this.http.post<Colaborador>(`${this.apiUrl}/criar`, colaborador);
  }

  atualizar(id: number, colaborador: AtualizarColaboradorDTO): Observable<Colaborador> {
    return this.http.put<Colaborador>(`${this.apiUrl}/${id}`, colaborador);
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
