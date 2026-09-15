import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AtualizarPerfilDTO, Perfil } from '../../models/perfil.model';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private apiUrl = `${environment.apiUrl}/membro/me`;
  readonly perfilAtual = signal<Perfil | null>(null);

  constructor(private http: HttpClient) {}

  buscarMeuPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(this.apiUrl).pipe(
      tap((perfil) => this.perfilAtual.set(perfil))
    );
  }

  atualizar(dto: AtualizarPerfilDTO): Observable<Perfil> {
    return this.http.put<Perfil>(this.apiUrl, dto).pipe(
      tap((perfil) => this.perfilAtual.set(perfil))
    );
  }
}
