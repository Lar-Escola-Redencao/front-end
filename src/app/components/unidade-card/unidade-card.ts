import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { DiasFuncionamentoPipe } from 'src/app/shared/pipes/dias-funcionamento.pipe';

@Component({
  selector: 'app-unidade-card',
  standalone: true,
  imports: [CommonModule, DiasFuncionamentoPipe],
  templateUrl: './unidade-card.html',
  styleUrl: './unidade-card.css',
})
export class UnidadeCard implements OnChanges {
  @Input({ required: true }) unidade!: Unidade;
  @Input() numero = 1;
  @Input() imagemUrl = '';
  imagemIndisponivel = false;

  ngOnChanges(): void {
    this.imagemIndisponivel = false;
  }

  formatarHorario(unidade: Unidade): string {
    return `${this.formatarHora(unidade.horarioAbertura)} às ${this.formatarHora(unidade.horarioFechamento)}`;
  }

  private formatarHora(hora: string): string {
    const [horas, minutos] = (hora || '').split(':');
    if (!horas) return hora ?? '';
    return minutos && minutos !== '00' ? `${horas}h${minutos}` : `${horas}h`;
  }
}
