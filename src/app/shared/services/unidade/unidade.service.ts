import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AtualizarUnidadeDTO, CriarUnidadeDTO, Unidade } from '../../models/unidade.model';

@Injectable({
  providedIn: 'root'
})
export class UnidadeService {
  private apiUrl = `${environment.apiUrl}/unidade`;

  constructor(private http: HttpClient) {}

  listarTodas(): Observable<Unidade[]> {
    return this.http.get<Unidade[]>(`${this.apiUrl}/todas`);
  }

  buscarPorId(id: number): Observable<Unidade> {
    return this.http.get<Unidade>(`${this.apiUrl}/${id}`);
  }

  criar(unidade: CriarUnidadeDTO): Observable<Unidade> {
    return this.http.post<Unidade>(`${this.apiUrl}/criar`, this.montarFormData(unidade));
  }

  atualizar(id: number, unidade: AtualizarUnidadeDTO): Observable<Unidade> {
    return this.http.put<Unidade>(`${this.apiUrl}/${id}`, this.montarFormData(unidade));
  }

  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private montarFormData(unidade: CriarUnidadeDTO): FormData {
    const formData = new FormData();
    formData.append('nome', unidade.nome);
    formData.append('endereco', unidade.endereco);
    formData.append('telefone', unidade.telefone);
    formData.append('email', unidade.email);
    formData.append('diasFuncionamento', unidade.diasFuncionamento);
    formData.append('horarioAbertura', unidade.horarioAbertura);
    formData.append('horarioFechamento', unidade.horarioFechamento);
    formData.append('idadeMin', unidade.idadeMin.toString());
    formData.append('idadeMax', unidade.idadeMax.toString());
    if (unidade.corHex) formData.append('corHex', unidade.corHex);
    if (unidade.imagem) formData.append('imagem', unidade.imagem);

    return formData;
  }
}
