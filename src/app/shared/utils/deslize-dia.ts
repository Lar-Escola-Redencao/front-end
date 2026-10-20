/** Esquerda avança o dia; direita volta. Ignora toques e rolagem vertical. */
export function diaPorDeslize(dx: number, dy: number, duracaoMs: number): -1 | 0 | 1 {
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5 || duracaoMs > 800) return 0;
  return dx < 0 ? 1 : -1;
}
