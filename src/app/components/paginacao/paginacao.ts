import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TAMANHOS_PAGINA_PERMITIDOS } from 'src/app/shared/utils/paginacao-url';

@Component({
  selector: 'app-paginacao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginacao.html',
  styleUrl: './paginacao.css'
})
export class Paginacao {

  @Input() paginaAtual = 0;
  @Input() totalPaginas = 0;
  @Input() totalElementos = 0;
  @Input() tamanho = 10;
  @Input() tamanhosDisponiveis: number[] = TAMANHOS_PAGINA_PERMITIDOS;
  @Input() carregando = false;

  @Output() paginaChange = new EventEmitter<number>();
  @Output() tamanhoChange = new EventEmitter<number>();

  get inicioIntervalo(): number {
    return this.totalElementos === 0 ? 0 : this.paginaAtual * this.tamanho + 1;
  }

  get fimIntervalo(): number {
    return Math.min((this.paginaAtual + 1) * this.tamanho, this.totalElementos);
  }

  get podeVoltar(): boolean {
    return !this.carregando && this.paginaAtual > 0;
  }

  get podeAvancar(): boolean {
    return !this.carregando && this.paginaAtual + 1 < this.totalPaginas;
  }

  irParaPrimeira(): void {
    if (this.podeVoltar) this.paginaChange.emit(0);
  }

  irParaAnterior(): void {
    if (this.podeVoltar) this.paginaChange.emit(this.paginaAtual - 1);
  }

  irParaProxima(): void {
    if (this.podeAvancar) this.paginaChange.emit(this.paginaAtual + 1);
  }

  irParaUltima(): void {
    if (this.podeAvancar) this.paginaChange.emit(this.totalPaginas - 1);
  }

  aoMudarTamanho(event: Event): void {
    const valor = Number((event.target as HTMLSelectElement).value);
    if (valor && valor !== this.tamanho) {
      this.tamanhoChange.emit(valor);
    }
  }
}
