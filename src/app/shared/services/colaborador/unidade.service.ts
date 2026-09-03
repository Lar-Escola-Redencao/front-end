import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UnidadeService {
  constructor(private http: HttpClient) {}

  listarTodos(): Observable<{ id: number, nome: string }[]> {
    return this.http.get<{ id: number, nome: string }[]>(`${environment.apiUrl}/unidade/todas`);
  }
}
