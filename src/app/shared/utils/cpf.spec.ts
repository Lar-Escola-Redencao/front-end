import { FormControl, Validators } from '@angular/forms';
import { cpfValido, obterMensagemErro, validarCpf } from './form-validations';

describe('Validação compartilhada de CPF', () => {
  it.each(['52998224725', '529.982.247-25', '11144477735', '12345678909'])(
    'aceita CPF válido com ou sem máscara: %s', valor => {
      expect(cpfValido(valor)).toBe(true);
      expect(new FormControl(valor, validarCpf).valid).toBe(true);
    },
  );

  it.each(['00000000000', '11111111111', '99999999999', '52998224724', '52998224715',
    '5299822472', '529982247255', 'abc52998224725', '529-982-247-25'])(
    'rejeita dígitos ou formato inválidos: %s', valor => {
      const controle = new FormControl(valor, validarCpf);
      expect(controle.hasError('cpfInvalido')).toBe(true);
      expect(obterMensagemErro(controle.errors)).toBe('Informe um CPF válido.');
    },
  );

  it('permite CPF vazio em campos opcionais e mantém a obrigatoriedade onde exigida', () => {
    expect(new FormControl('', validarCpf).valid).toBe(true);
    expect(new FormControl(null, validarCpf).valid).toBe(true);
    expect(new FormControl('', [Validators.required, validarCpf]).hasError('required')).toBe(true);
  });
});
