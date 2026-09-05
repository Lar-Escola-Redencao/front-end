import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { environment } from 'src/environments/environment';

export interface TabelaColuna<T = any> {
  chave: keyof T & string;
  titulo: string;
  formatar?: (valor: any, linha: T) => string;
  principalMobile?: boolean;
  tipo?: 'texto' | 'status' | 'imagem' | 'documento';
  /** Quando true, o cabeçalho fica clicável e emite (ordenar). */
  ordenavel?: boolean;
  /**
   * Nome do campo a enviar no `sort` pro back, quando diferente de `chave`
   * (ex.: coluna exibe `nomePapel`, mas o back ordena por `papel.nomePapel`).
   */
  campoOrdenacao?: string;
}

export interface TabelaAcao<T = any> {
  icone: string;
  tooltip: string;
  acao: string;
  executar?: (linha: T) => void;
}

export interface TabelaOrdenacao {
  campo: string;
  direcao: 'asc' | 'desc';
}

@Component({
  selector: 'app-tabela-layout',
  standalone: true,

  imports: [
    MatIconModule
  ],

  templateUrl: './tabela-layout.html',
  styleUrl: './tabela-layout.css'
})
export class TabelaLayout<T = any> {

  @Input() colunas: TabelaColuna<T>[] = [];

  /** Já é a página atual vinda do back — este componente não pagina no cliente. */
  @Input() dados: T[] = [];

  @Input() acoes: TabelaAcao<T>[] = [];

  @Input() mensagemVazia = 'Nenhum registro encontrado.';

  @Input() carregando = false;

  @Input() erro = false;

  @Input() mensagemErro = 'Não foi possível carregar os dados. Tente novamente.';

  @Input() ordenacao: TabelaOrdenacao | null = null;

  @Output() acao = new EventEmitter<{
    tipo: string;
    linha: T;
  }>();

  @Output() ordenar = new EventEmitter<string>();

  @Output() tentarNovamente = new EventEmitter<void>();

  apiUrl = environment.apiUrl;

  linhaExpandida: number | null = null;

  toggleLinha(index: number): void {
    this.linhaExpandida =
      this.linhaExpandida === index
        ? null
        : index;
  }

  obterValorPrincipal(linha: T): string {
    const colunaPrincipal =
      this.colunas.find(c => c.principalMobile) ||
      this.colunas[0];

    return this.obterValor(linha, colunaPrincipal);
  }

  get valorTotalColunas(): number {
    return (
      this.colunas.length +
      (this.acoes.length > 0 ? 1 : 0)
    );
  }

  obterValor(
    linha: T,
    coluna: TabelaColuna<T>
  ): string {

    const valor = linha[coluna.chave];

    if (coluna.formatar) {
      return coluna.formatar(valor, linha);
    }

    return valor !== null &&
      valor !== undefined
      ? String(valor)
      : '-';
  }

  obterUrlImagem(valor: any): string | null {
    if (!valor) {
      return null;
    }

    const valorString = String(valor);

    if (
      valorString.startsWith('http://') ||
      valorString.startsWith('https://')
    ) {
      return valorString;
    }

    // Caso o backend retorne /uploads/...
    return `${this.apiUrl}${valorString}`;
  }

  obterUrlDocumento(valor: any): string | null {
    if (!valor) {
      return null;
    }

    const valorString = String(valor);

    if (
      valorString.startsWith('http://') ||
      valorString.startsWith('https://')
    ) {
      return valorString;
    }

    return `${this.apiUrl}${valorString}`;
  }

  obterStatus(valor: any): string {
    return valor === true
      ? 'Ativo'
      : 'Inativo';
  }


  executarAcao(
    acao: TabelaAcao<T>,
    linha: T
  ): void {

    if (acao.executar) {
      acao.executar(linha);
      return;
    }

    this.acao.emit({
      tipo: acao.acao,
      linha
    });
  }

  ordenarPor(coluna: TabelaColuna<T>): void {
    if (!coluna.ordenavel || this.carregando) {
      return;
    }

    this.ordenar.emit(coluna.campoOrdenacao ?? coluna.chave);
  }

  direcaoOrdenacao(coluna: TabelaColuna<T>): 'asc' | 'desc' | null {
    const campo = coluna.campoOrdenacao ?? coluna.chave;
    return this.ordenacao?.campo === campo ? this.ordenacao.direcao : null;
  }
}
