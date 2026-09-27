import { Pipe, PipeTransform } from '@angular/core';

interface DiaSemana {
  valor: string;
  label: string;
}

const DIAS_SEMANA: DiaSemana[] = [
  { valor: 'SEG', label: 'Segunda' },
  { valor: 'TER', label: 'Terça' },
  { valor: 'QUA', label: 'Quarta' },
  { valor: 'QUI', label: 'Quinta' },
  { valor: 'SEX', label: 'Sexta' },
  { valor: 'SAB', label: 'Sábado' },
  { valor: 'DOM', label: 'Domingo' },
];

const DIAS_UTEIS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];

// Converte "SEG;TER;QUA;QUI;SEX" em "Segunda a Sexta", "SEG;QUA" em "Segunda e Quarta", etc.
@Pipe({
  name: 'diasFuncionamento',
  standalone: true,
})
export class DiasFuncionamentoPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    const dias = this.separarDias(valor);
    if (!dias.length) return '-';

    const todos = DIAS_SEMANA.map((d) => d.valor);
    if (this.mesmoConjunto(dias, todos)) return 'Todos os dias';
    if (this.mesmoConjunto(dias, DIAS_UTEIS)) return 'Segunda a Sexta';

    const labels = this.ordenarDias(dias).map(
      (dia) => DIAS_SEMANA.find((d) => d.valor === dia)?.label ?? dia
    );

    if (labels.length === 1) return labels[0];
    return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
  }

  private separarDias(valor: string | null | undefined): string[] {
    return (valor || '')
      .split(';')
      .map((d) => d.trim().toUpperCase())
      .filter(Boolean);
  }

  private ordenarDias(dias: string[]): string[] {
    return DIAS_SEMANA.map((d) => d.valor).filter((valor) => dias.includes(valor));
  }

  private mesmoConjunto(a: string[], b: string[]): boolean {
    return a.length === b.length && b.every((valor) => a.includes(valor));
  }
}
