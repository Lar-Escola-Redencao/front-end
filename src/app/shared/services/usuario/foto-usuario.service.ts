import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SILENCIAR_TOAST_ACESSO } from '../../interceptors/acesso-toast.context';

/** Rota protegida da foto devolvida pela API, ex.: `/usuarios/12/foto?v=1a2b`. */
const ROTA_FOTO_PROTEGIDA = /^\/usuarios\/\d+\/foto(\?.*)?$/;

/**
 * Carrega fotos de usuários pela rota protegida da API (com o token, via interceptor) e as
 * converte em URLs temporárias (`blob:`) para exibição. Quem recebe a URL é responsável por
 * liberá-la com {@link FotoUsuarioService.liberar} quando não precisar mais dela.
 */
@Injectable({ providedIn: 'root' })
export class FotoUsuarioService {
  private readonly http = inject(HttpClient);

  /**
   * Emite a URL pronta para `<img [src]>` ou `null` quando não há foto ou ela não pôde ser
   * carregada (sem acesso, removida, falha de rede). Prévias locais (`data:`/`blob:`) passam direto.
   */
  carregar(caminho: string | null | undefined): Observable<string | null> {
    if (!caminho) return of(null);
    if (ehPreviaLocal(caminho)) return of(caminho);
    if (!ROTA_FOTO_PROTEGIDA.test(caminho)) return of(null);

    return this.http.get(`${environment.apiUrl}${caminho}`, {
      responseType: 'blob',
      // A falta de acesso à foto não é um erro da tela: exibimos a imagem padrão sem toast.
      context: new HttpContext().set(SILENCIAR_TOAST_ACESSO, true),
    }).pipe(
      map(blob => (blob.size > 0 && blob.type.startsWith('image/') ? URL.createObjectURL(blob) : null)),
      catchError(() => of(null)),
    );
  }

  /** Libera uma URL criada por {@link carregar}; ignora valores que não são `blob:`. */
  liberar(url: string | null | undefined): void {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

function ehPreviaLocal(caminho: string): boolean {
  return caminho.startsWith('data:image/') || caminho.startsWith('blob:');
}
