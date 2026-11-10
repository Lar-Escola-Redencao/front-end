/** Converte o HTML institucional legado para edição em texto comum. */
export function textoParaEdicao(conteudo: string): string {
  if (!/<\/?(?:p|div|br|h[1-6]|ul|ol|li|strong|em|b|i|a|script|style)\b[^>]*>/i.test(conteudo)) return conteudo;
  const documento = new DOMParser().parseFromString(conteudo, 'text/html');
  documento.querySelectorAll('script, style').forEach(elemento => elemento.remove());
  documento.querySelectorAll('br').forEach(elemento => elemento.replaceWith('\n'));
  documento.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li').forEach(elemento => elemento.append('\n\n'));
  return (documento.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

/** O binding innerHTML do Angular continua responsável por sanitizar o HTML legado. */
export function textoParaExibicao(conteudo: string): string {
  if (/<\/?(?:p|div|br|h[1-6]|ul|ol|li|strong|em|b|i|a)\b[^>]*>/i.test(conteudo)) return conteudo;
  return conteudo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
