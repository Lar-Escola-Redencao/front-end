import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface OcorrenciaResponseDTO {
  id: number;
  idMatricula: number;
  dataOcorrencia: string;
  dataCriacao: string;
  descricao: string;
  tipoOcorrencia: 'COMPORTAMENTO' | 'SAUDE' | 'ASSISTENCIA' | 'OUTRO';
  nomeMembro: string;
}

export interface FrequenciaUsuarioResponseDTO {
  idMatricula: number;
  idUsuario: number;
  nomeUsuario: string;
  imagemPerfil: string;
  idFrequencia: number | null;
  presente: boolean | null;
  statusMatricula?: string; /* Adicionado para capturar o EXCLUIDO */
  ocorrencias: OcorrenciaResponseDTO[];
}

export interface FrequenciaDTO {
  idMatricula: number;
  presente: boolean;
}

export interface SalvarFrequenciaEmLoteDTO {
  idTurma: number;
  data: string;
  frequencias: FrequenciaDTO[];
}

@Injectable({
  providedIn: 'root'
})
export class DiarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrlFrequencia = `${environment.apiUrl}/frequencia`;
  private readonly apiUrlOcorrencia = `${environment.apiUrl}/ocorrencia`;

  listarFrequencia(idTurma: number, data: string): Observable<FrequenciaUsuarioResponseDTO[]> {
    const params = new HttpParams().set('idTurma', idTurma).set('data', data);
    return this.http.get<FrequenciaUsuarioResponseDTO[]>(this.apiUrlFrequencia, { params });
  }

  salvarEmLote(dto: SalvarFrequenciaEmLoteDTO): Observable<void> {
    return this.http.post<void>(this.apiUrlFrequencia, dto);
  }

  atualizarFrequencia(id: number, presente: boolean): Observable<FrequenciaUsuarioResponseDTO> {
    return this.http.put<FrequenciaUsuarioResponseDTO>(`${this.apiUrlFrequencia}/${id}`, { presente });
  }

  criarOcorrencia(dto: any): Observable<OcorrenciaResponseDTO> {
    return this.http.post<OcorrenciaResponseDTO>(this.apiUrlOcorrencia, dto);
  }

  atualizarOcorrencia(id: number, dto: any): Observable<OcorrenciaResponseDTO> {
    return this.http.put<OcorrenciaResponseDTO>(`${this.apiUrlOcorrencia}/${id}`, dto);
  }

  deletarOcorrencia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrlOcorrencia}/${id}`);
  }
}