import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { TipoEvento } from 'src/app/shared/models/evento.model';
import { Alertas } from 'src/app/shared/utils/alerts';

export interface FiltrosEventos {
  dataInicial: string;
  dataFinal: string;
  valor: 'todos' | 'gratuito' | 'pago';
  tipo: TipoEvento | null;
}

export const filtrosEventosVazios = (): FiltrosEventos => ({
  dataInicial: '', dataFinal: '', valor: 'todos', tipo: null
});

@Component({
  selector: 'app-filtros-eventos',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, ModalLayout],
  templateUrl: './filtros-eventos.html',
  styleUrl: './filtros-eventos.css'
})
export class FiltrosEventosComponent {
  @Input() filtros: FiltrosEventos = filtrosEventosVazios();
  @Output() aplicar = new EventEmitter<FiltrosEventos>();
  aberto = false;
  rascunho = filtrosEventosVazios();
  readonly categorias = [
    { valor: TipoEvento.ARRECADACAO, nome: 'Arrecadação' },
    { valor: TipoEvento.CULTURAL, nome: 'Cultural' },
    { valor: TipoEvento.COMEMORATIVO, nome: 'Comemorativo' }
  ];

  get quantidade(): number {
    return Number(!!this.filtros.dataInicial) + Number(!!this.filtros.dataFinal)
      + Number(this.filtros.valor !== 'todos') + Number(!!this.filtros.tipo);
  }

  abrirCalendario(campo: HTMLInputElement): void {
    campo.focus();
    if (typeof campo.showPicker === 'function') campo.showPicker();
  }

  get intervaloInvalido(): boolean {
    return !!this.rascunho.dataInicial && !!this.rascunho.dataFinal
      && this.rascunho.dataInicial > this.rascunho.dataFinal;
  }

  abrir(): void {
    this.rascunho = { ...this.filtros };
    this.aberto = true;
  }

  async fechar(): Promise<void> {
    if (JSON.stringify(this.rascunho) !== JSON.stringify(this.filtros)
      && await Alertas.confirmarSaidaFiltros() === 'voltar') return;
    this.aberto = false;
  }

  limpar(): void {
    this.rascunho = filtrosEventosVazios();
    this.aplicar.emit({ ...this.rascunho });
  }

  confirmar(): void {
    if (this.intervaloInvalido) return;
    this.aplicar.emit({ ...this.rascunho });
    this.aberto = false;
  }
}
