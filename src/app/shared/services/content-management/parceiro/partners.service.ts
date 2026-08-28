import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Partner, PartnerInput } from '../../../models/partner.model';

@Injectable({ providedIn: 'root' })
export class PartnersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/parceiro`;

  listarTodos(): Promise<Partner[]> {
    return firstValueFrom(this.http.get<Partner[]>(`${this.baseUrl}/todos`));
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
