import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CriarAssistidoDTO, AssistidoResponseDTO } from '../../models/assistido.model';
import { ContatoListagemDTO } from '../../models/contato.model';

@Injectable({ providedIn: 'root' })
export class AssistidoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/assistidos`;

  listarAssistidos(): Observable<AssistidoResponseDTO[]> {
    return this.http.get<AssistidoResponseDTO[]>(this.apiUrl);
  }

  buscarPorId(id: number): Observable<AssistidoResponseDTO> {
    return this.http.get<AssistidoResponseDTO>(`${this.apiUrl}/${id}`);
  }

  criar(dto: CriarAssistidoDTO): Observable<AssistidoResponseDTO> {
    return this.http.post<AssistidoResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: CriarAssistidoDTO): Observable<AssistidoResponseDTO> {
    return this.http.put<AssistidoResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  atualizarFotoPerfil(id: number, arquivo: File): Observable<void> {
    const formData = new FormData();
    formData.append('foto', arquivo);

    return this.http.post<void>(`${this.apiUrl}/${id}/foto`, formData);
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ContatoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/contatos`;

  buscarAutocomplete(termo: string): Observable<ContatoListagemDTO[]> {
    return this.http.get<ContatoListagemDTO[]>(`${this.apiUrl}/buscar`, { params: { termo } });
  }
}


