import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ArquivoSaudeDTO, CadastroUsuarioCompletoDTO, UsuarioResponseDTO } from '../../models/usuario.model';
import {
  AtualizarVinculoDTO,
  ContatoDTO,
  VincularContatoExistenteDTO
} from '../../models/contato.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

<<<<<<< HEAD
  listarAssistidos(search?: string): Observable<AssistidoResponseDTO[]> {
    const params = search ? { search } : undefined;
    return this.http.get<AssistidoResponseDTO[]>(this.apiUrl, { params });
=======
  listarUsuarios(search?: string): Observable<UsuarioResponseDTO[]> {
    const params = search ? { search } : undefined;
    return this.http.get<UsuarioResponseDTO[]>(this.apiUrl, { params });
>>>>>>> teste-dev
  }

  buscarAutocomplete(termo: string, unidadeId: number): Observable<UsuarioResponseDTO[]> {
    return this.http.get<UsuarioResponseDTO[]>(`${this.apiUrl}/buscar`, { params: { termo, unidadeId } });
  }

  buscarPorId(id: number): Observable<UsuarioResponseDTO> {
    return this.http.get<UsuarioResponseDTO>(`${this.apiUrl}/${id}`);
  }

  criar(dto: CadastroUsuarioCompletoDTO, arquivosSaude: File[] = []): Observable<UsuarioResponseDTO> {
    if (!arquivosSaude.length) return this.http.post<UsuarioResponseDTO>(this.apiUrl, dto);
    const formData = new FormData();
    formData.append('dados', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    arquivosSaude.forEach(arquivo => formData.append('arquivosSaude', arquivo));
    return this.http.post<UsuarioResponseDTO>(this.apiUrl, formData);
  }

  atualizar(id: number, dto: Partial<CadastroUsuarioCompletoDTO>): Observable<UsuarioResponseDTO> {
    return this.http.put<UsuarioResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  atualizarFotoPerfil(id: number, arquivo: File): Observable<void> {
    const formData = new FormData();
    formData.append('foto', arquivo);
    return this.http.post<void>(`${this.apiUrl}/${id}/foto`, formData);
  }

  uploadArquivoSaude(id: number, arquivo: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('titulo', arquivo.name);
    formData.append('arquivo', arquivo);
    return this.http.post(`${this.apiUrl}/${id}/arquivos-saude`, formData);
  }

  listarArquivosSaude(id: number): Observable<ArquivoSaudeDTO[]> {
    return this.http.get<ArquivoSaudeDTO[]>(`${this.apiUrl}/${id}/arquivos-saude`);
  }

  deletarArquivoSaude(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/arquivos-saude/${id}`);
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  vincularNovoContato(idUsuario: number, dto: ContatoDTO): Observable<UsuarioResponseDTO> {
    return this.http.post<UsuarioResponseDTO>(`${this.apiUrl}/${idUsuario}/contatos`, dto);
  }

  vincularContatoExistente(
    idUsuario: number,
    idContato: number,
    dto: VincularContatoExistenteDTO
  ): Observable<UsuarioResponseDTO> {
    return this.http.post<UsuarioResponseDTO>(
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
