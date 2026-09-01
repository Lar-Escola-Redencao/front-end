import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AtualizarUnidadeDTO, CriarUnidadeDTO, Unidade } from '../../models/unidade.model';

@Injectable({
  providedIn: 'root'
})
export class UnidadeService {
  private apiUrl = `${environment.apiUrl}/unidade`;

  constructor(private http: HttpClient) {}

  listarTodas(): Observable<Unidade[]> {
    return this.http.get<Unidade[]>(`${this.apiUrl}/todas`);
  }

  buscarPorId(id: number): Observable<Unidade> {
    return this.http.get<Unidade>(`${this.apiUrl}/${id}`);
  }

  criar(unidade: CriarUnidadeDTO): Observable<Unidade> {
    return this.http.post<Unidade>(`${this.apiUrl}/criar`, unidade);
  }

  atualizar(id: number, unidade: AtualizarUnidadeDTO): Observable<Unidade> {
    return this.http.put<Unidade>(`${this.apiUrl}/${id}`, unidade);
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
