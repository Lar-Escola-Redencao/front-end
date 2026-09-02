import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Documento, Secao } from 'src/app/shared/models/transparencia.model';

@Injectable({
  providedIn: 'root',
})
export class TransparenciaPublicaService {
  private apiUrl = `${environment.apiUrl}/transparencia`;

  constructor(private http: HttpClient) {}

  listarSecoes(): Observable<Secao[]> {
    return this.http.get<Secao[]>(`${this.apiUrl}/secoes`);
  }

  urlVisualizar(documento: Documento): string {
    return `${environment.apiUrl}${documento.arquivo}`;
  }

  urlBaixar(documento: Documento): string {
    return `${this.apiUrl}/documento/${documento.id}/download`;
  }
}
