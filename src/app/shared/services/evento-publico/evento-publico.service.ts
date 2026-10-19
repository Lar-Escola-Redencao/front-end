import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { catchError, expand, map, reduce } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Evento, EventoRedeSocial, TipoEvento } from 'src/app/shared/models/evento.model';

interface EventoPagedResponse {
  content?: Evento[];
  _embedded?: Record<string, Evento[]>;
  page?: { number: number; totalPages: number };
}

@Injectable({
  providedIn: 'root'
})
export class EventoPublicoService {
  private readonly apiUrl = `${environment.apiUrl}/evento`;

  constructor(private http: HttpClient) {}

  tratarImagem(caminho: string | null | undefined): string {
    if (!caminho) return '';
    if (
      caminho.startsWith('http://') ||
      caminho.startsWith('https://') ||
      caminho.startsWith('data:') ||
      caminho.startsWith('/api/') ||
      caminho.startsWith('/images/')
    ) {
      return caminho;
    }

    return `${environment.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }

  listarPublicos(
    page = 0,
    size = 50,
    tipo?: TipoEvento
  ): Observable<Evento[]> {
    let params = new HttpParams()
      .set('size', size)
      .append('sort', 'dataEvento,asc')
      .append('sort', 'id,asc');

    if (tipo) {
      params = params.set('tipo', tipo);
    }

    const carregarPagina = (numero: number) =>
      this.http.get<Evento[] | EventoPagedResponse>(`${this.apiUrl}/todos`, {
        params: params.set('page', numero),
      });

    // O backend limita cada página a 50 itens. Percorre os metadados para
    // carregar o histórico completo antes da busca e paginação locais.
    return carregarPagina(page).pipe(
      expand(resposta => {
        if (Array.isArray(resposta) || !resposta.page) return EMPTY;
        const proxima = resposta.page.number + 1;
        return proxima < resposta.page.totalPages ? carregarPagina(proxima) : EMPTY;
      }),
      reduce((eventos, resposta) => eventos.concat(this.extrairEventos(resposta)), [] as Evento[]),
      map(eventos =>
        eventos
          .map(evento => ({ ...evento, imagem: this.tratarImagem(evento.imagem) }))
          .sort((a, b) => new Date(a.dataEvento).getTime() - new Date(b.dataEvento).getTime())
      )
    );
  }

  // As redes sociais vêm de um endpoint próprio; se ele falhar o detalhe do evento
  // continua abrindo, apenas sem o overlay de redes sociais.
  buscarPorId(id: number): Observable<Evento> {
    return forkJoin({
      evento: this.http.get<Evento>(`${this.apiUrl}/${id}`),
      redesSociais: this.listarRedesSociais(id)
    }).pipe(
      map(({ evento, redesSociais }) => ({
        ...evento,
        imagem: this.tratarImagem(evento.imagem),
        redesSociais,
        parceiros: (evento.parceiros ?? []).map(parceiro => ({
          ...parceiro,
          logo: this.tratarImagem(parceiro.logo)
        }))
      }))
    );
  }

  // Só exibimos a rede social quando há um ícone pra ela: sem ícone, não tem
  // como mostrar de qual rede se trata, então o item fica de fora do overlay.
  listarRedesSociais(id: number): Observable<EventoRedeSocial[]> {
    return this.http.get<EventoRedeSocial[]>(`${this.apiUrl}/${id}/redes-sociais`).pipe(
      map(redes =>
        (redes ?? [])
          .map(rede => ({ ...rede, icone: this.tratarIconeRedeSocial(rede.icone) }))
          .filter(rede => rede.urlLink?.trim() && rede.icone)
      ),
      catchError(() => of([]))
    );
  }

  private tratarIconeRedeSocial(caminho: string | null | undefined): string {
    if (!caminho) return '';
    if (caminho.startsWith('/images/')) {
      return caminho;
    }

    return this.tratarImagem(caminho);
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
