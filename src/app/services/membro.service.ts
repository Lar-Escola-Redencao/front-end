import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Membro, CriarMembroDTO, AtualizarMembroDTO } from '../models/membro.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MembroService {
  private apiUrl = `${environment.apiUrl}/membro`;

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Membro[]> {
    return this.http.get<Membro[]>(`${this.apiUrl}/todos`);
  }

  buscarPorId(id: number): Observable<Membro> {
    return this.http.get<Membro>(`${this.apiUrl}/${id}`);
  }

  criar(membro: CriarMembroDTO): Observable<Membro> {
    return this.http.post<Membro>(`${this.apiUrl}/criar`, membro);
  }

  atualizar(id: number, membro: AtualizarMembroDTO): Observable<Membro> {
    return this.http.put<Membro>(`${this.apiUrl}/atualizar/${id}`, membro);
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/deletar/${id}`);
  }
}
