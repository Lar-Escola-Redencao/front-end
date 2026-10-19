import { montarEndereco, separarEndereco } from './endereco';

describe('Endereço no cadastro', () => {
  it('separa e recompõe número e complemento sem duplicação', () => {
    const dados = separarEndereco('Rua das Flores, 123A, Casa dos fundos');
    expect(dados.numeroEndereco).toBe('123A');
    expect(montarEndereco(dados.endereco, dados.numeroEndereco, dados.complementoEndereco))
      .toBe('Rua das Flores, 123A, Casa dos fundos');
  });

  it('preserva endereço antigo que não permite identificar o número com segurança', () => {
    const dados = separarEndereco('Rua 14 - Centro');
    expect(montarEndereco(dados.endereco, dados.numeroEndereco, dados.complementoEndereco))
      .toBe('Rua 14 - Centro');
  });

  it('aceita endereço sem número usando s/n', () => {
    expect(separarEndereco('Rua das Flores, s/n').numeroEndereco).toBe('s/n');
  });
});
