import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ParceiroService {
  constructor(private http: HttpClient) {}

  listarTodos(): Observable<{ id: number; nome: string; logo: string }[]> {
    return this.http.get<{ id: number; nome: string; logo: string }[]>(`${environment.apiUrl}/parceiro/todos`);
  }
}
