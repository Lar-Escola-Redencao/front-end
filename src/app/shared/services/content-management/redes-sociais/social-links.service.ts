import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SocialLink, SocialLinkInput } from '../../../models/social-link.model';
import { PaginaResposta } from '../../../models/pagina.model';
import { construirHttpParams } from '../../../utils/paginacao-url';

@Injectable({ providedIn: 'root' })
export class SocialLinksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rede-social`;

  /** Rota pública, sem paginação — hoje não é usada pela tela admin. */
  listarTodas(): Promise<SocialLink[]> {
    return firstValueFrom(this.http.get<SocialLink[]>(`${this.baseUrl}/todas`));
  }

  /** Rota autenticada e paginada, usada pela tela de gerenciamento. */
  listarAdmin(pagina: number, tamanho: number, sort?: string): Promise<PaginaResposta<SocialLink>> {
    const params = construirHttpParams({ pagina, tamanho, sort });
    return firstValueFrom(this.http.get<PaginaResposta<SocialLink>>(`${this.baseUrl}/admin`, { params }));
  }

  create(input: SocialLinkInput): Promise<SocialLink> {
    const formData = new FormData();
    formData.append('nome', input.nome);
    formData.append('url', input.url);
    if (input.icone) {
      formData.append('icone', input.icone);
    }
    return firstValueFrom(this.http.post<SocialLink>(`${this.baseUrl}/criar`, formData));
  }

  update(id: number, input: SocialLinkInput): Promise<SocialLink> {
    const formData = new FormData();
    formData.append('nome', input.nome);
    formData.append('url', input.url);
    formData.append('ativo', String(input.ativo ?? true));
    if (input.icone) {
      formData.append('icone', input.icone);
    }
    return firstValueFrom(this.http.put<SocialLink>(`${this.baseUrl}/${id}`, formData));
  }
}
