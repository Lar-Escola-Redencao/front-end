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

  criar(dto: CriarAssistidoDTO): Observable<AssistidoResponseDTO> {
    return this.http.post<AssistidoResponseDTO>(this.apiUrl, dto);
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
