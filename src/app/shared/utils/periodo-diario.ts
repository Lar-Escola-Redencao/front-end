/** Datas ISO de calendário; o chamador fornece o dia atual no horário de Brasília. */
export function inicioPeriodoDiario(hoje: string): string {
  const [ano, mes] = hoje.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 2, 1)).toISOString().slice(0, 10);
}
