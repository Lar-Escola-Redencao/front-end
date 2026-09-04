import { HttpParams } from '@angular/common/http';
import { ParamMap } from '@angular/router';

export const TAMANHO_PAGINA_PADRAO = 10;
export const TAMANHO_PAGINA_MAXIMO = 50;
export const TAMANHOS_PAGINA_PERMITIDOS = [5, 10, 25, 50];

export interface ParametrosPagina {
  pagina: number;
  tamanho: number;
  sort?: string;
}

/**
 * Lê page/size/sort da query string, com os mesmos defaults e teto do
 * PaginacaoConfig do back (size padrão 10, teto 50).
 */
export function lerParametrosPagina(
  params: ParamMap,
  tamanhoPadrao: number = TAMANHO_PAGINA_PADRAO
): ParametrosPagina {
  const paginaBruta = Number(params.get('page'));
  const pagina = Number.isFinite(paginaBruta) && paginaBruta > 0 ? Math.floor(paginaBruta) : 0;

  const tamanhoBruto = Number(params.get('size'));
  const tamanho = Number.isFinite(tamanhoBruto) && tamanhoBruto > 0
    ? Math.min(Math.floor(tamanhoBruto), TAMANHO_PAGINA_MAXIMO)
    : tamanhoPadrao;

  const sort = params.get('sort') ?? undefined;

  return { pagina, tamanho, sort };
}

export interface CampoOrdenacao {
  campo: string;
  direcao: 'asc' | 'desc';
}

/** Lê o parâmetro `sort` (formato "campo,direcao") vindo da URL. */
export function analisarOrdenacao(sort?: string): CampoOrdenacao | null {
  if (!sort) {
    return null;
  }

  const [campo, direcao] = sort.split(',');

  if (!campo) {
    return null;
  }

  return { campo, direcao: direcao === 'desc' ? 'desc' : 'asc' };
}

/** Alterna a direção quando o clique é no mesmo campo já ordenado, senão volta pra 'asc'. */
export function alternarOrdenacao(atual: CampoOrdenacao | null, campo: string): string {
  const direcao = atual?.campo === campo && atual.direcao === 'asc' ? 'desc' : 'asc';
  return `${campo},${direcao}`;
}

export function construirHttpParams(opcoes: {
  pagina: number;
  tamanho: number;
  sort?: string;
  extras?: Record<string, string | number | null | undefined>;
}): HttpParams {
  let params = new HttpParams()
    .set('page', opcoes.pagina)
    .set('size', opcoes.tamanho);

  if (opcoes.sort) {
    params = params.set('sort', opcoes.sort);
  }

  if (opcoes.extras) {
    for (const [chave, valor] of Object.entries(opcoes.extras)) {
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(chave, valor);
      }
    }
  }

  return params;
}
