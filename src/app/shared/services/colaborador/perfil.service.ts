import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AtualizarPerfilDTO, Perfil } from '../../models/perfil.model';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private apiUrl = `${environment.apiUrl}/membro/me`;

  constructor(private http: HttpClient) {}

  buscarMeuPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(this.apiUrl);
  }

  atualizar(dto: AtualizarPerfilDTO): Observable<Perfil> {
    return this.http.put<Perfil>(this.apiUrl, dto);
  }
}
