import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AtualizarDiretoriaDTO, CriarDiretoriaDTO, Diretoria } from '../../../models/diretoria.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiretoriaService {
  private apiUrl = `${environment.apiUrl}/diretoria`;

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Diretoria[]> {
    return this.http.get<Diretoria[]>(`${this.apiUrl}/todos`);
  }

  buscarPorId(id: number): Observable<Diretoria> {
    return this.http.get<Diretoria>(`${this.apiUrl}/${id}`);
  }

  criar(dto: CriarDiretoriaDTO): Observable<Diretoria> {
    const formData = new FormData();
    formData.append('nome', dto.nome);
    formData.append('cargo', dto.cargo);
    formData.append('foto', dto.foto);
    return this.http.post<Diretoria>(`${this.apiUrl}/criar`, formData);
  }

  atualizar(id: number, dto: AtualizarDiretoriaDTO): Observable<Diretoria> {
    const formData = new FormData();
    formData.append('nome', dto.nome);
    formData.append('cargo', dto.cargo);
    formData.append('ativo', String(dto.ativo));
    if (dto.foto) {
      formData.append('foto', dto.foto);
    }
    return this.http.put<Diretoria>(`${this.apiUrl}/${id}`, formData);
  }

  fotoUrl(caminho: string | null | undefined): string {
    if (!caminho) return '';
    return `${environment.apiUrl}${caminho}`;
  }
}
