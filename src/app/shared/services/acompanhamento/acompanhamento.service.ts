import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { PaginaResposta } from '../../models/pagina.model';
import { construirHttpParams } from '../../utils/paginacao-url';
import { OcorrenciaResponseDTO } from '../diario/diario.service';

export interface OcorrenciaAcompanhamento extends OcorrenciaResponseDTO { turmaUnidade: string; }
export interface Entrevista {
  id: number;
  idUsuario: number;
  idMembro: number;
  nomeResponsavel: string;
  dataEntrevista: string;
  relato: string;
  dataRegistro: string;
}
export interface DadosEntrevista { dataEntrevista: string; relato: string; }

@Injectable({ providedIn: 'root' })
export class AcompanhamentoService {
  private readonly http = inject(HttpClient);
  private url(usuario: number) { return `${environment.apiUrl}/acompanhamento/usuarios/${usuario}`; }

  ocorrencias(usuario: number, pagina: number, tamanho: number, search: string) {
    return this.http.get<PaginaResposta<OcorrenciaAcompanhamento>>(`${this.url(usuario)}/ocorrencias`, {
      params: construirHttpParams({ pagina, tamanho, extras: { search } }),
    });
  }

  entrevistas(usuario: number, pagina: number, tamanho: number, search: string) {
    return this.http.get<PaginaResposta<Entrevista>>(`${this.url(usuario)}/entrevistas`, {
      params: construirHttpParams({ pagina, tamanho, extras: { search } }),
    });
  }

  salvarEntrevista(usuario: number, id: number | null, dados: DadosEntrevista) {
    const url = `${this.url(usuario)}/entrevistas`;
    return id === null ? this.http.post<Entrevista>(url, dados) : this.http.put<Entrevista>(`${url}/${id}`, dados);
  }

  excluirEntrevista(usuario: number, id: number) {
    return this.http.delete<void>(`${this.url(usuario)}/entrevistas/${id}`);
  }
}
