import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Secao {
  id: number;
  titulo: string;
}

export interface CriarSecaoDTO {
  titulo: string;
}

export interface AtualizarSecaoDTO {
  titulo: string;
}

@Injectable({ providedIn: 'root' })
export class TransparenciaService {
  private apiUrl = `${environment.apiUrl}/transparencia`;

  constructor(private http: HttpClient) { }

  listarSecoes(): Observable<Secao[]> {
    return this.http.get<Secao[]>(`${this.apiUrl}/secoes`);
  }

  criarSecao(dto: CriarSecaoDTO): Observable<Secao> {
    const formData = new FormData();
    formData.append('titulo', dto.titulo);
    return this.http.post<Secao>(`${this.apiUrl}/criar-secao`, formData);
  }

  atualizarSecao(id: number, dto: AtualizarSecaoDTO): Observable<Secao> {
    const formData = new FormData();
    formData.append('titulo', dto.titulo);
    return this.http.put<Secao>(`${this.apiUrl}/secao/${id}`, formData);
  }

  deletarSecao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/secao/${id}`);
  }

  adicionarDocumento(secaoId: number, titulo: string, arquivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('arquivo', arquivo);
    return this.http.post<any>(`${this.apiUrl}/secao/${secaoId}/upload-documento`, formData);
  }

  atualizarDocumento(id: number, secaoId: number, titulo: string, arquivo?: File): Observable<any> {
    const formData = new FormData();
    formData.append('secaoId', secaoId.toString());
    formData.append('titulo', titulo);

    if (arquivo) {
      formData.append('arquivo', arquivo);
    }

    return this.http.put<any>(`${this.apiUrl}/documento/${id}`, formData);
  }

  deletarDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documento/${id}`);
  }
}