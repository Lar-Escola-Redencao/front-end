import { FormGroup } from '@angular/forms';

const MENSAGENS_GENERICAS: Record<string, (err: any) => string> = {
  required: () => 'Este campo é obrigatório.',
  minlength: (err) => `Mínimo de ${err.requiredLength} caracteres.`,
  maxlength: (err) => `Máximo de ${err.requiredLength} caracteres.`,
  email: () => 'Digite um e-mail válido.',
  min: (err) => `O valor não pode ser menor que ${err.min}.`,
  pattern: () => 'Formato inválido.',
  senhasDiferentes: () => 'As senhas não coincidem.'
};

export function mapearErrosFormulario(
  formGroup: FormGroup,
  mensagensCustomizadas: Record<string, Record<string, string>> = {}
): { [key: string]: string } {
  const erros: { [key: string]: string } = {};

  Object.keys(formGroup.controls).forEach(campo => {
    const controle = formGroup.get(campo);
    
    if (controle && controle.invalid && (controle.dirty || controle.touched)) {
      const primeiroErroAtivo = Object.keys(controle.errors!)[0];
      
      if (mensagensCustomizadas[campo]?.[primeiroErroAtivo]) {
        erros[campo] = mensagensCustomizadas[campo][primeiroErroAtivo];
      } else if (MENSAGENS_GENERICAS[primeiroErroAtivo]) {
        erros[campo] = MENSAGENS_GENERICAS[primeiroErroAtivo](controle.errors![primeiroErroAtivo]);
      } else {
        erros[campo] = 'Campo inválido.';
      }
    }
  });

  return erros;
}