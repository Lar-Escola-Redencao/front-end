import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Diretoria } from 'src/app/shared/models/diretoria.model';
import { Partner } from 'src/app/shared/models/partner.model';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import { SocialLink } from 'src/app/shared/models/social-link.model';

@Injectable({ providedIn: 'root' })
export class PublicContentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getDiretoriaAtiva(): Observable<Diretoria[]> {
    return this.http.get<PaginaResposta<Diretoria>>(`${this.apiUrl}/diretoria/todos?size=100`).pipe(
      map(resposta => resposta.content.filter(m => m.ativo)),
      catchError(() => of([]))
    );
  }

  getParceirosAtivos(): Observable<Partner[]> {
    return this.http.get<PaginaResposta<Partner>>(`${this.apiUrl}/parceiro/todos?size=100`).pipe(
      map(resposta => resposta.content.filter(p => p.ativo)),
      catchError(() => of([]))
    );
  }

  getRedesSociaisAtivas(): Observable<SocialLink[]> {
    return this.http.get<SocialLink[]>(`${this.apiUrl}/rede-social/todas`).pipe(
      map(redes => redes.filter(rede => rede.ativo)),
      catchError(() => of([]))
    );
  }

  tratarUrlImagem(caminho: string | null | undefined): string {
    if (!caminho) return '';
    if (caminho.startsWith('http') || caminho.startsWith('data:')) {
      return caminho;
    }
    if (caminho.startsWith('/images/')) {
      return caminho;
    }
    return `${this.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }
}
