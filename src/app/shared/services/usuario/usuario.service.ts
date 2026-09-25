import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CriarAssistidoDTO, AssistidoResponseDTO } from '../../models/usuario.model';
import {
  AtualizarVinculoDTO,
  ContatoDTO,
  VincularContatoExistenteDTO
} from '../../models/contato.model';

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

  // ---- Vínculos com contatos (usados no modal "Novo vínculo" / "Usuários vinculados") ----

  /** Cria um contato novo já vinculado ao usuário informado. */
  vincularNovoContato(idUsuario: number, dto: ContatoDTO): Observable<AssistidoResponseDTO> {
    return this.http.post<AssistidoResponseDTO>(`${this.apiUrl}/${idUsuario}/contatos`, dto);
  }

  /** Vincula um contato já existente a um usuário (fluxo do modal "Novo vínculo"). */
  vincularContatoExistente(
    idUsuario: number,
    idContato: number,
    dto: VincularContatoExistenteDTO
  ): Observable<AssistidoResponseDTO> {
    return this.http.post<AssistidoResponseDTO>(
      `${this.apiUrl}/${idUsuario}/contatos/${idContato}/vincular`,
      dto
    );
  }

  atualizarVinculo(idUsuario: number, idContato: number, dto: AtualizarVinculoDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${idUsuario}/contatos/${idContato}`, dto);
  }

  desvincularContato(idUsuario: number, idContato: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idUsuario}/contatos/${idContato}`);
  }
}
