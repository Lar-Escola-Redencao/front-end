import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SocialLink, SocialLinkInput } from '../../../shared/models/social-link.model';

@Injectable({ providedIn: 'root' })
export class SocialLinksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rede-social`;

  listarTodas(): Promise<SocialLink[]> {
    return firstValueFrom(this.http.get<SocialLink[]>(`${this.baseUrl}/todas`));
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
