import { describe, expect, it } from 'vitest';
import { inicioPeriodoDiario } from './periodo-diario';

describe('Início do período permitido do diário', () => {
  it.each([
    ['2026-10-17', '2026-09-01'],
    ['2026-10-01', '2026-09-01'],
    ['2026-01-31', '2025-12-01'],
    ['2024-03-31', '2024-02-01'],
    ['2026-03-01', '2026-02-01']
  ])('calcula o primeiro dia do mês anterior a %s', (hoje, esperado) => {
    expect(inicioPeriodoDiario(hoje)).toBe(esperado);
  });
});
