import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Evento } from 'src/app/shared/models/evento.model';

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

  listarPublicos(): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.apiUrl}/todos`).pipe(
      map(eventos =>
        eventos
          .map(evento => ({ ...evento, imagem: this.tratarImagem(evento.imagem) }))
          .filter(evento => new Date(evento.dataEvento).getTime() >= Date.now())
          .sort((a, b) => new Date(a.dataEvento).getTime() - new Date(b.dataEvento).getTime())
      )
    );
  }
}
