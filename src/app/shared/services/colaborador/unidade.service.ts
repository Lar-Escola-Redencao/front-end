import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PaginaResposta } from '../../models/pagina.model';

@Injectable({
  providedIn: 'root'
})
export class UnidadeService {
  constructor(private http: HttpClient) {}

  listarTodos(): Observable<{ id: number, nome: string }[]> {
    return this.http.get<PaginaResposta<{ id: number, nome: string }>>(`${environment.apiUrl}/unidade/todas`)
      .pipe(map(resposta => resposta.content));
  }
}
