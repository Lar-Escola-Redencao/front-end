import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  Injectable
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';

export interface TabelaColuna<T = any> {
  chave: keyof T & string;
  titulo: string;
  formatar?: (valor: any, linha: T) => string;
  principalMobile?: boolean;
}

export interface TabelaAcao<T = any> {
  icone: string;
  tooltip: string;
  acao: string;
  executar?: (linha: T) => void;
}


@Injectable()
export class PaginatorIntlPtBr extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Itens por página:';
  override nextPageLabel = 'Próxima página';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primeira página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }
    
    length = Math.max(length, 0);
    const startIndex = page * pageSize;
    
    // Calcula o índice final
    const endIndex = startIndex < length ?
      Math.min(startIndex + pageSize, length) :
      startIndex + pageSize;
      
    return `${startIndex + 1} - ${endIndex} de ${length}`;
  };
}

@Component({
  selector: 'app-tabela-layout',
  standalone: true,
  imports: [
    MatIconModule,
    MatPaginatorModule
  ],
  templateUrl: './tabela-layout.html',
  styleUrl: './tabela-layout.css',
  providers: [
    { provide: MatPaginatorIntl, useClass: PaginatorIntlPtBr }
  ]
})
export class TabelaLayout<T = any> {

  @Input() colunas: TabelaColuna<T>[] = [];

  @Input() dados: T[] = [];

  @Input() acoes: TabelaAcao<T>[] = [];

  @Input() exibirPaginacao = true;

  @Input() tamanhoPagina = 10;

  @Input() tamanhosPagina: number[] = [5, 10, 25, 50];

  @Input() mensagemVazia = 'Nenhum registro encontrado.';

  @Output() acao = new EventEmitter<{
    tipo: string;
    linha: T;
  }>();
  

  dadosPaginados: T[] = [];

  paginaAtual = 0;

  linhaExpandida: number | null = null;

  toggleLinha(index: number): void {
    this.linhaExpandida =
      this.linhaExpandida === index
        ? null
        : index;
  }

  obterValorPrincipal(linha: T): string {
    const colunaPrincipal = this.colunas.find(c => c.principalMobile) || this.colunas[0];
    return this.obterValor(linha, colunaPrincipal);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dados'] || changes['tamanhoPagina']) {
      this.atualizarPagina();
    }
  }

  get valorTotalColunas(): number {
    return this.colunas.length + (this.acoes.length > 0 ? 1 : 0);
  }

  obterValor(linha: T, coluna: TabelaColuna<T>): string {
    const valor = linha[coluna.chave];

    if (coluna.formatar) {
      return coluna.formatar(valor, linha);
    }

    return valor !== null && valor !== undefined
      ? String(valor)
      : '-';
  }

  executarAcao(acao: TabelaAcao<T>, linha: T): void {
    if (acao.executar) {
      acao.executar(linha);
      return;
    }

    this.acao.emit({
      tipo: acao.acao,
      linha
    });
  }

  alterarPagina(evento: PageEvent): void {
    this.paginaAtual = evento.pageIndex;
    this.tamanhoPagina = evento.pageSize;

    this.atualizarPagina();
  }

  private atualizarPagina(): void {
    if (!this.exibirPaginacao) {
      this.dadosPaginados = [...this.dados];
      return;
    }

    const inicio = this.paginaAtual * this.tamanhoPagina;
    const fim = inicio + this.tamanhoPagina;

    this.dadosPaginados = this.dados.slice(inicio, fim);
  }
}