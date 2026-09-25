import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Documento, Secao } from 'src/app/shared/models/transparencia.model';
import { ID_PAGINA_TRANSPARENCIA } from 'src/app/shared/services/pagina/pagina-cms.service';

@Injectable({
  providedIn: 'root',
})
export class TransparenciaPublicaService {
  private apiUrl = `${environment.apiUrl}/paginas`;

  constructor(private http: HttpClient) {}

  listarSecoes(): Observable<Secao[]> {
    return this.http.get<Secao[]>(`${this.apiUrl}/${ID_PAGINA_TRANSPARENCIA}/secoes`).pipe(
      map((secoes) => [...secoes].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))),
    );
  }

  urlVisualizar(documento: Documento): string {
    return `${environment.apiUrl}${documento.arquivo}`;
  }

  urlBaixar(documento: Documento): string {
    return `${this.apiUrl}/documentos/${documento.id}/download`;
  }
}
