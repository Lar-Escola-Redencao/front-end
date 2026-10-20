import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { MembroLogadoDTO, Papel } from './sessao.model';


@Injectable({ providedIn: 'root' })
export class SessaoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/membro`;

  private readonly _membro = signal<MembroLogadoDTO | null>(null);
  private carregando = false;
  private carregamentoEmAndamento?: Observable<MembroLogadoDTO | null>;

  readonly membro = this._membro.asReadonly();

  readonly isAdministrador = computed(() => this._membro()?.nomePapel === Papel.ADMINISTRADOR);
  readonly isCoordenador = computed(() => this._membro()?.nomePapel === Papel.COORDENADOR);
  readonly isMonitor = computed(() => this._membro()?.nomePapel === Papel.MONITOR);

  readonly unidadesPermitidasIds = computed<number[] | null>(() => {
    const membro = this._membro();
    if (!membro) return [];
    if (membro.nomePapel === Papel.ADMINISTRADOR) return null; // null = todas as unidades
    return (membro.unidades || []).map(u => u.id);
  });

  carregar(): Observable<MembroLogadoDTO | null> {
    if (this._membro()) return of(this._membro());
    if (this.carregamentoEmAndamento) return this.carregamentoEmAndamento;

    this.carregando = true;
    this.carregamentoEmAndamento = this.http.get<MembroLogadoDTO>(`${this.apiUrl}/me`).pipe(
      tap((membro) => {
        this._membro.set(membro);
      }),
      catchError(() => {
        return of(null);
      }),
      finalize(() => {
        this.carregando = false;
        this.carregamentoEmAndamento = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.carregamentoEmAndamento;
  }

  limpar(): void {
    this._membro.set(null);
    this.carregamentoEmAndamento = undefined;
    this.carregando = false;
  }

  temAcessoAUnidade(idUnidade: number | null | undefined): boolean {
    if (this.isMonitor()) return false;
    const permitidas = this.unidadesPermitidasIds();
    if (permitidas === null) return true; // admin
    if (!idUnidade) return false;
    return permitidas.includes(idUnidade);
  }

  podeCadastrarUsuario(): boolean {
    return this.isAdministrador() || this.isCoordenador();
  }

  podeEditarUsuario(idUnidadeDoUsuario: number | null | undefined): boolean {
    if (this.isAdministrador()) return true;
    if (this.isCoordenador()) return this.temAcessoAUnidade(idUnidadeDoUsuario);
    return false;
  }

  podeExcluirUsuario(idUnidadeDoUsuario: number | null | undefined): boolean {
    return this.podeEditarUsuario(idUnidadeDoUsuario);
  }

  podeGerenciarContatos(): boolean {
    return this.isAdministrador() || this.isCoordenador();
  }

  podeRemoverVinculo(idUnidadeDoUsuarioVinculado: number | null | undefined): boolean {
    if (this.isAdministrador()) return true;
    if (this.isCoordenador()) return this.temAcessoAUnidade(idUnidadeDoUsuarioVinculado);
    return false;
  }
}
