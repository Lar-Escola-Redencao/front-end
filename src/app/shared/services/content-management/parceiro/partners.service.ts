import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Partner, PartnerInput } from '../../../models/partner.model';
import { PaginaResposta } from '../../../models/pagina.model';
import { construirHttpParams } from '../../../utils/paginacao-url';

@Injectable({ providedIn: 'root' })
export class PartnersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/parceiro`;

  listarTodos(pagina: number, tamanho: number, sort?: string): Promise<PaginaResposta<Partner>> {
    const params = construirHttpParams({ pagina, tamanho, sort });
    return firstValueFrom(this.http.get<PaginaResposta<Partner>>(`${this.baseUrl}/todos`, { params }));
  }

  create(input: PartnerInput): Promise<Partner> {
    const formData = new FormData();
    formData.append('nome', input.nome);
    if (input.logo) {
      formData.append('logo', input.logo);
    }
    return firstValueFrom(this.http.post<Partner>(`${this.baseUrl}/criar`, formData));
  }

  update(id: number, input: PartnerInput): Promise<Partner> {
    const formData = new FormData();
    formData.append('nome', input.nome);
    formData.append('ativo', String(input.ativo ?? true));
    if (input.logo) {
      formData.append('logo', input.logo);
    }
    return firstValueFrom(this.http.put<Partner>(`${this.baseUrl}/${id}`, formData));
  }

  delete(id: number): Promise<void>{
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
