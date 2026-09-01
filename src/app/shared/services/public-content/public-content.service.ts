import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Diretoria } from 'src/app/shared/models/diretoria.model';
import { Partner } from 'src/app/shared/models/partner.model';

@Injectable({ providedIn: 'root' })
export class PublicContentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getDiretoriaAtiva(): Observable<Diretoria[]> {
    return this.http.get<Diretoria[]>(`${this.apiUrl}/diretoria/todos`).pipe(
      map(dados => dados.filter(m => m.ativo)),
      catchError(() => of([]))
    );
  }

  getParceirosAtivos(): Observable<Partner[]> {
    return this.http.get<Partner[]>(`${this.apiUrl}/parceiro/todos`).pipe(
      map(dados => dados.filter(p => p.ativo)),
      catchError(() => of([]))
    );
  }

  tratarUrlImagem(caminho: string | null | undefined): string {
    if (!caminho) return '';
    if (caminho.startsWith('http') || caminho.startsWith('data:')) {
      return caminho;
    }
    return `${this.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }
}