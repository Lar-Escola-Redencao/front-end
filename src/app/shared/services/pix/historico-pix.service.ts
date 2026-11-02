import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { CodigoPix } from './pix.service';

@Injectable({ providedIn: 'root' })
export class HistoricoPixService {
  private readonly documento = inject(DOCUMENT);
  private readonly chaveArmazenamento = 'ler.pix.codigos.v1';
  private readonly limiteRegistros = 20;
  private readonly registros = signal<CodigoPix[]>([]);
  readonly codigos = this.registros.asReadonly();
  readonly indisponivel = signal(false);

  constructor() {
    try {
      const armazenamento = this.documento.defaultView?.localStorage;
      if (!armazenamento) {
        this.indisponivel.set(true);
        return;
      }
      const dados: unknown = JSON.parse(armazenamento.getItem(this.chaveArmazenamento) ?? '[]');
      if (Array.isArray(dados)) {
        this.registros.set(dados.filter((item) => this.codigoValido(item)).slice(0, this.limiteRegistros));
      }
    } catch {
      this.indisponivel.set(true);
    }
  }

  salvar(codigo: CodigoPix): void {
    this.registros.update((itens) => {
      const registrosMantidos = itens.filter((item) => {
        const mesmoCodigo = item.identificador === codigo.identificador;
        const pendenteDaMesmaChave = item.chave === codigo.chave && item.contribuicaoInformada !== true;
        return !mesmoCodigo && !pendenteDaMesmaChave;
      });
      return [codigo, ...registrosMantidos].slice(0, this.limiteRegistros);
    });
    this.persistir();
  }

  remover(identificador: string): void {
    this.registros.update((itens) => itens.filter((item) => item.identificador !== identificador));
    this.persistir();
  }

  cancelarPendentes(chave: string): void {
    this.registros.update((itens) => itens.filter((item) =>
      item.chave !== chave || item.contribuicaoInformada === true));
    this.persistir();
  }

  informarContribuicao(identificador: string): void {
    this.registros.update((itens) => itens.map((item) => {
      if (item.identificador === identificador) {
        return { ...item, contribuicaoInformada: true };
      }
      return item;
    }));
    this.persistir();
  }

  private codigoValido(item: unknown): item is CodigoPix {
    if (!item || typeof item !== 'object') return false;
    const codigo = item as Partial<CodigoPix>;
    return (
      typeof codigo.identificador === 'string' &&
      /^[A-Za-z0-9]{1,25}$/.test(codigo.identificador) &&
      typeof codigo.valor === 'number' &&
      Number.isFinite(codigo.valor) &&
      codigo.valor >= 0.01 &&
      codigo.valor <= 999999.99 &&
      typeof codigo.chave === 'string' &&
      codigo.chave.length <= 77 &&
      (codigo.nomeRecebedor === null || (typeof codigo.nomeRecebedor === 'string' && codigo.nomeRecebedor.length <= 25)) &&
      typeof codigo.cidadeRecebedor === 'string' &&
      codigo.cidadeRecebedor.length <= 15 &&
      typeof codigo.copiaECola === 'string' &&
      /^000201[\x20-\x7E]{50,500}$/.test(codigo.copiaECola) &&
      typeof codigo.qrCode === 'string' &&
      /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(codigo.qrCode) &&
      codigo.qrCode.length < 100000 &&
      typeof codigo.geradoEm === 'string' &&
      Number.isFinite(Date.parse(codigo.geradoEm)) &&
      (codigo.expiraEm === undefined || (typeof codigo.expiraEm === 'string' && Number.isFinite(Date.parse(codigo.expiraEm)))) &&
      (codigo.contribuicaoInformada === undefined || typeof codigo.contribuicaoInformada === 'boolean')
    );
  }

  private persistir(): void {
    try {
      const armazenamento = this.documento.defaultView?.localStorage;
      if (!armazenamento) {
        this.indisponivel.set(true);
        return;
      }
      armazenamento.setItem(this.chaveArmazenamento, JSON.stringify(this.registros()));
      this.indisponivel.set(false);
    } catch {
      this.indisponivel.set(true);
    }
  }
}
