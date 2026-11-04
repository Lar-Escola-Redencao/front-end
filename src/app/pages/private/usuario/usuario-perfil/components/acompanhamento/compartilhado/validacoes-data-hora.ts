import { AbstractControl, ValidationErrors } from '@angular/forms';

export function hojeBrasilia(): string {
  const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(Date.now()));
  const valor = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const instante = new Date(`${data}T12:00:00Z`);
  return Number.isFinite(instante.getTime()) && instante.toISOString().slice(0, 10) === data;
}

export function dataNaoFutura(control: AbstractControl): ValidationErrors | null {
  const data = control.value as string;
  if (!data) return null;
  if (!dataValida(data)) return { regra: 'Informe uma data válida.' };
  return data > hojeBrasilia() ? { regra: 'A data não pode estar no futuro.' } : null;
}

export function horarioNaoFuturo(control: AbstractControl): ValidationErrors | null {
  const horario = control.value as string;
  if (!horario) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) return { regra: 'Informe um horário válido.' };
  const data = control.parent?.get('data')?.value as string;
  // Uma data futura deve ser corrigida no próprio campo de data.
  if (!data || !dataValida(data) || data > hojeBrasilia()) return null;
  return Date.parse(`${data}T${horario}:00-03:00`) > Date.now()
    ? { regra: 'O horário não pode estar no futuro.' } : null;
}
