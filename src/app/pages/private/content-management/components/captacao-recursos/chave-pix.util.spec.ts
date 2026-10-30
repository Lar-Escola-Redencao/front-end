import { FormControl } from '@angular/forms';
import { formatarChavePix, identificarTipoChavePix, validarTipoChavePix } from './chave-pix.util';

describe('Cadastro da chave Pix', () => {
  it('formata CPF e CNPJ numérico ou alfanumérico', () => {
    expect(formatarChavePix('52998224725', 'cpf')).toBe('529.982.247-25');
    expect(formatarChavePix('11222333000181', 'cnpj')).toBe('11.222.333/0001-81');
    expect(formatarChavePix('12abc34501de35', 'cnpj')).toBe('12.ABC.345/01DE-35');
  });

  it('normaliza e-mail e mantém chave aleatória sem máscara', () => {
    expect(formatarChavePix(' Doacoes@Example.org ', 'email')).toBe('doacoes@example.org');
    const chave = '123e4567-e89b-12d3-a456-426614174000';
    expect(formatarChavePix(chave, 'aleatoria')).toBe(chave);
    expect(identificarTipoChavePix(chave)).toBe('aleatoria');
  });

  it('formata telefone brasileiro com DDI e preserva DDI estrangeiro', () => {
    expect(formatarChavePix('11987654321', 'telefone')).toBe('+55 (11) 98765-4321');
    expect(formatarChavePix('+5511987654321', 'telefone')).toBe('+55 (11) 98765-4321');
    expect(formatarChavePix('+12025550123', 'telefone')).toBe('+12025550123');
  });

  it('revalida o campo quando o tipo selecionado muda', () => {
    let tipo: 'email' | 'cpf' = 'email';
    const validar = validarTipoChavePix(() => tipo);
    const controle = new FormControl('529.982.247-25');
    expect(validar(controle)).not.toBeNull();
    tipo = 'cpf';
    expect(validar(controle)).toBeNull();
  });
});
