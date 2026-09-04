import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AtualizarDiretoriaDTO, CriarDiretoriaDTO, Diretoria } from '../../../models/diretoria.model';
import { PaginaResposta } from '../../../models/pagina.model';
import { construirHttpParams } from '../../../utils/paginacao-url';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiretoriaService {
  private apiUrl = `${environment.apiUrl}/diretoria`;

  constructor(private http: HttpClient) {}

  listarTodos(pagina: number, tamanho: number, sort?: string): Observable<PaginaResposta<Diretoria>> {
    const params = construirHttpParams({ pagina, tamanho, sort });
    return this.http.get<PaginaResposta<Diretoria>>(`${this.apiUrl}/todos`, { params });
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

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  fotoUrl(caminho: string | null | undefined): string {
    if (!caminho) return '';
    return `${environment.apiUrl}${caminho}`;
  }
}
