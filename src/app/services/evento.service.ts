import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Evento, CriarEventoDTO, AtualizarEventoDTO } from '../models/evento.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private apiUrl = `${environment.apiUrl}/evento`;

  constructor(private http: HttpClient) { }

  listarTodos(): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.apiUrl}/todos`);
  }

  buscarPorId(id: number): Observable<Evento> {
    return this.http.get<Evento>(`${this.apiUrl}/${id}`);
  }

  private formatarDataJava(dataStr: any): string {
    if (!dataStr) return '';
    const str = String(dataStr);
    return str.length === 16 ? `${str}:00` : str;
  }

  criar(evento: CriarEventoDTO): Observable<Evento> {
    const formData = new FormData();
    formData.append('titulo', evento.titulo);
    formData.append('descricao', evento.descricao);
    formData.append('dataEvento', this.formatarDataJava(evento.dataEvento));
    formData.append('endereco', evento.endereco);
    if (evento.imagem) formData.append('imagem', evento.imagem);
    if (evento.valor !== null && evento.valor !== undefined) formData.append('valor', evento.valor.toString());
    formData.append('tipoEvento', evento.tipoEvento);
    if (evento.parceirosIds && evento.parceirosIds.length > 0) {
      evento.parceirosIds.forEach(id => formData.append('parceirosIds', id.toString()));
    }

    return this.http.post<Evento>(`${this.apiUrl}/criar`, formData);
  }

  atualizar(id: number, evento: AtualizarEventoDTO): Observable<Evento> {
    const formData = new FormData();
    if (evento.titulo) formData.append('titulo', evento.titulo);
    if (evento.descricao) formData.append('descricao', evento.descricao);
    if (evento.dataEvento) formData.append('dataEvento', this.formatarDataJava(evento.dataEvento));
    if (evento.endereco) formData.append('endereco', evento.endereco);
    if (evento.imagem) formData.append('imagem', evento.imagem);
    if (evento.valor !== null && evento.valor !== undefined) formData.append('valor', evento.valor.toString());
    if (evento.tipoEvento) formData.append('tipoEvento', evento.tipoEvento);
    if (evento.comentarioPosEvento) formData.append('comentarioPosEvento', evento.comentarioPosEvento);
    if (evento.parceirosIds !== undefined && evento.parceirosIds !== null) {
      evento.parceirosIds.forEach(id => formData.append('parceirosIds', id.toString()));
    }

    return this.http.put<Evento>(`${this.apiUrl}/${id}`, formData);
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
