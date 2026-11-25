export const PAGINA_INICIAL_INTERNA = '/dashboard';

/**
 * Valida o `returnUrl` recebido no login: só aceita endereços da área interna (`/dashboard...`).
 * Qualquer outro valor (página pública, login, URL externa ou `//host`) volta para a página inicial
 * interna, evitando redirecionamentos para fora do sistema e ciclos entre login e páginas públicas.
 */
export function destinoInternoSeguro(url: string | null | undefined): string {
  if (!url || url.includes('\\') || url.startsWith('//')) {
    return PAGINA_INICIAL_INTERNA;
  }
  return /^\/dashboard(?:[/?#]|$)/.test(url) ? url : PAGINA_INICIAL_INTERNA;
}
