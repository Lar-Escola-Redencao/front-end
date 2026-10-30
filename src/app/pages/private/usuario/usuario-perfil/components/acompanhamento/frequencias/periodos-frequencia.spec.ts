import { completarMeses, intervaloPeriodo, validarIntervalo } from './periodos-frequencia';

describe('Períodos da frequência', () => {
  it('usa o ano inteiro e trata a virada do ano e o mês bissexto', () => {
    expect(intervaloPeriodo('ESTE_ANO', '2026-10-29')).toEqual({ dataInicio: '2026-01-01', dataFim: '2026-12-31' });
    expect(intervaloPeriodo('ANO_PASSADO', '2026-10-29')).toEqual({ dataInicio: '2025-01-01', dataFim: '2025-12-31' });
    expect(intervaloPeriodo('MES_PASSADO', '2026-01-10')).toEqual({ dataInicio: '2025-12-01', dataFim: '2025-12-31' });
    expect(intervaloPeriodo('MES_PASSADO', '2024-03-10')).toEqual({ dataInicio: '2024-02-01', dataFim: '2024-02-29' });
    expect(intervaloPeriodo('ESTE_MES', '2026-04-02')).toEqual({ dataInicio: '2026-04-01', dataFim: '2026-04-30' });
  });
  it('inclui hoje nas janelas dos últimos 15 e 30 dias', () => {
    expect(intervaloPeriodo('ULTIMOS_15_DIAS', '2026-01-10')).toEqual({ dataInicio: '2025-12-27', dataFim: '2026-01-10' });
    expect(intervaloPeriodo('ULTIMOS_30_DIAS', '2026-03-01')).toEqual({ dataInicio: '2026-01-31', dataFim: '2026-03-01' });
  });
  it('valida datas obrigatórias, reais e na ordem certa', () => {
    expect(validarIntervalo('', '')).toContain('Informe');
    expect(validarIntervalo('2026-02-30', '2026-03-01')).toContain('válidas');
    expect(validarIntervalo('2026-02-02', '2026-02-01')).toContain('anterior');
    expect(validarIntervalo('2026-02-01', '2026-02-01')).toBeNull();
  });
  it('completa meses sem registros com zeros e diferencia anos distintos', () => {
    const meses = completarMeses('2025-12-20', '2026-02-02', [
      { ano: 2026, mes: 2, presencas: 3, faltas: 1 },
    ]);
    expect(meses).toEqual([
      { ano: 2025, mes: 12, presencas: 0, faltas: 0 },
      { ano: 2026, mes: 1, presencas: 0, faltas: 0 },
      { ano: 2026, mes: 2, presencas: 3, faltas: 1 },
    ]);
    expect(meses.reduce((total, mes) => total + mes.faltas, 0)).toBe(1);
  });
});
