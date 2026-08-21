import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PapelService {
  constructor(private http: HttpClient) {}

  listarTodos(): Observable<{ id: number, nome: string }[]> {
    return this.http.get<{ id: number, nome: string }[]>('/papel/todos');
  }
}
