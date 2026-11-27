import { textoParaEdicao, textoParaExibicao } from './texto-paragrafos';

describe('Textos com parágrafos', () => {
  it('preserva texto comum e linhas em branco', () => {
    const texto = 'Primeiro parágrafo.\n\nSegundo parágrafo.\nOutra linha.';
    expect(textoParaEdicao(texto)).toBe(texto);
    expect(textoParaExibicao(texto)).toBe(texto);
  });
  it('converte parágrafos HTML existentes para edição sem exigir tags', () => {
    expect(textoParaEdicao('<p>Ação &amp; cuidado<br>Outra linha</p><p>Evolução.</p>'))
      .toBe('Ação & cuidado\nOutra linha\n\nEvolução.');
  });
  it('preserva o HTML legado para sanitização pelo Angular e escapa texto comum', () => {
    expect(textoParaExibicao('<p>Legado</p>')).toBe('<p>Legado</p>');
    expect(textoParaExibicao('Texto <script>alert(1)</script>')).toContain('&lt;script&gt;');
    expect(textoParaEdicao('<p>Seguro</p><script>alert(1)</script>')).toBe('Seguro');
  });
});
