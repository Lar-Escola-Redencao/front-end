import { destinoInternoSeguro } from './destino-seguro';

describe('destinoInternoSeguro', () => {
  it('mantém endereços da área interna', () => {
    expect(destinoInternoSeguro('/dashboard')).toBe('/dashboard');
    expect(destinoInternoSeguro('/dashboard/usuarios/3?aba=saude')).toBe('/dashboard/usuarios/3?aba=saude');
  });

  it('descarta páginas públicas, login e destinos externos', () => {
    for (const url of [null, '', '/', '/entrar', '/transparencia', '/dashboardx', '//evil.example', 'https://evil.example', '/\\evil']) {
      expect(destinoInternoSeguro(url)).toBe('/dashboard');
    }
  });
});
