import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  Evento,
  TipoEvento
} from 'src/app/shared/models/evento.model';

interface EventoPagedResponse {
  content?: Evento[];
  _embedded?: Record<string, Evento[]>;
}

@Injectable({
  providedIn: 'root'
})
export class EventoPublicoService {
  private readonly apiUrl = `${environment.apiUrl}/evento`;

  constructor(private http: HttpClient) {}

  private tratarImagem(caminho: string | null | undefined): string {
    if (!caminho) return '';
    if (
      caminho.startsWith('http://') ||
      caminho.startsWith('https://') ||
      caminho.startsWith('data:')
    ) {
      return caminho;
    }

    return `${environment.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }

  listarPublicos(
    page = 0,
    size = 1000,
    tipo?: TipoEvento
  ): Observable<Evento[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (tipo) {
      params = params.set('tipo', tipo);
    }

    return this.http.get<Evento[] | EventoPagedResponse>(`${this.apiUrl}/todos`, { params }).pipe(
      map(resposta =>
        this.extrairEventos(resposta)
          .map(evento => ({ ...evento, imagem: this.tratarImagem(evento.imagem) }))
          .filter(evento => new Date(evento.dataEvento).getTime() >= Date.now())
          .sort((a, b) => new Date(a.dataEvento).getTime() - new Date(b.dataEvento).getTime())
      )
    );
  }

  private extrairEventos(resposta: Evento[] | EventoPagedResponse): Evento[] {
    if (Array.isArray(resposta)) {
      return resposta;
    }

    if (Array.isArray(resposta.content)) {
      return resposta.content;
    }

    const embedded = resposta._embedded
      ? Object.values(resposta._embedded).find(Array.isArray)
      : null;

    return embedded ?? [];
  }
}
