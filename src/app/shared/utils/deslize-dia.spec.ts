import { describe, expect, it } from 'vitest';
import { diaPorDeslize } from './deslize-dia';

describe('Navegação por gesto na data do diário', () => {
  it('avança ao deslizar para a esquerda', () => expect(diaPorDeslize(-65, 5, 250)).toBe(1));
  it('volta ao deslizar para a direita', () => expect(diaPorDeslize(65, 5, 250)).toBe(-1));
  it('ignora um toque', () => expect(diaPorDeslize(0, 0, 50)).toBe(0));
  it('ignora movimentos horizontais curtos', () => expect(diaPorDeslize(25, 0, 250)).toBe(0));
  it('preserva a rolagem vertical', () => expect(diaPorDeslize(45, 90, 250)).toBe(0));
  it('ignora movimentos diagonais sem direção horizontal clara', () => expect(diaPorDeslize(-60, 55, 250)).toBe(0));
  it('ignora um arraste demorado', () => expect(diaPorDeslize(65, 0, 1500)).toBe(0));
});
