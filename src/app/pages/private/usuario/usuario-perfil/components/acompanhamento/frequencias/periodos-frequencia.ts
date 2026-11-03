import { FrequenciaMensal } from 'src/app/shared/services/acompanhamento/acompanhamento.service';

export const PERIODOS_FREQUENCIA = [
  { valor: 'ESTE_MES', rotulo: 'Este mês' },
  { valor: 'MES_PASSADO', rotulo: 'Mês passado' },
  { valor: 'ULTIMOS_15_DIAS', rotulo: 'Últimos 15 dias' },
  { valor: 'ULTIMOS_30_DIAS', rotulo: 'Últimos 30 dias' },
  { valor: 'ESTE_ANO', rotulo: 'Este ano' },
  { valor: 'ANO_PASSADO', rotulo: 'Ano passado' },
  { valor: 'PERSONALIZADO', rotulo: 'Personalizado' },
] as const;
export type PeriodoFrequencia = typeof PERIODOS_FREQUENCIA[number]['valor'];

export function hojeBrasilia(): string {
  const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const obter = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  return `${obter('year')}-${obter('month')}-${obter('day')}`;
}

export function intervaloPeriodo(periodo: Exclude<PeriodoFrequencia, 'PERSONALIZADO'>, hoje: string) {
  const data = new Date(`${hoje}T12:00:00Z`);
  const iso = (valor: Date) => valor.toISOString().slice(0, 10);
  let ano = data.getUTCFullYear(); let mes = data.getUTCMonth();
  if (periodo === 'ULTIMOS_15_DIAS' || periodo === 'ULTIMOS_30_DIAS') {
    data.setUTCDate(data.getUTCDate() - (periodo === 'ULTIMOS_15_DIAS' ? 14 : 29));
    return { dataInicio: iso(data), dataFim: hoje };
  }
  if (periodo === 'ESTE_ANO' || periodo === 'ANO_PASSADO') {
    if (periodo === 'ANO_PASSADO') ano--;
    return { dataInicio: `${ano}-01-01`, dataFim: `${ano}-12-31` };
  }
  if (periodo === 'MES_PASSADO') { mes--; if (mes < 0) { mes = 11; ano--; } }
  return { dataInicio: iso(new Date(Date.UTC(ano, mes, 1))), dataFim: iso(new Date(Date.UTC(ano, mes + 1, 0))) };
}

export function validarIntervalo(inicio: string, fim: string): string | null {
  if (!inicio || !fim) return 'Informe a data inicial e a data final.';
  const valida = (valor: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(`${valor}T12:00:00Z`);
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
  };
  if (!valida(inicio) || !valida(fim)) return 'Informe datas válidas.';
  if (fim < inicio) return 'A data final não pode ser anterior à data inicial.';
  return null;
}

export function completarMeses(inicio: string, fim: string, registros: FrequenciaMensal[]): FrequenciaMensal[] {
  const existentes = new Map(registros.map(m => [`${m.ano}-${m.mes}`, m]));
  let [ano, mes] = inicio.split('-').map(Number);
  const [anoFinal, mesFinal] = fim.split('-').map(Number);
  const meses: FrequenciaMensal[] = [];
  while (ano < anoFinal || (ano === anoFinal && mes <= mesFinal)) {
    meses.push(existentes.get(`${ano}-${mes}`) ?? { ano, mes, presencas: 0, faltas: 0 });
    if (++mes > 12) { ano++; mes = 1; }
  }
  return meses;
}
