import { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';

const MENSAGENS_GENERICAS: Record<string, (err: any) => string> = {
  required: () => 'Este campo é obrigatório.',
  minlength: (err) => `Mínimo de ${err.requiredLength} caracteres.`,
  maxlength: (err) => `Máximo de ${err.requiredLength} caracteres.`,
  email: () => 'Digite um e-mail válido.',
  min: (err) => `O valor não pode ser menor que ${err.min}.`,
  pattern: () => 'Formato inválido.',
  senhasDiferentes: () => 'As senhas não coincidem.',

  formatoArquivoInvalido: () => 'Formato de arquivo inválido.'
};

/**
 * Formatos de imagem aceitos.
 */
export const EXTENSOES_IMAGEM_PERMITIDAS = [
  'jpg',
  'jpeg',
  'png',
  'webp'
];

/**
 * Formatos de documento aceitos.
 */
export const EXTENSOES_DOCUMENTO_PERMITIDAS = [
  'pdf',
  'docx',
  'xlsx'
];

/**
 * Valida a extensão e o MIME de um arquivo.
 */
export function validarExtensaoArquivo(
  extensoesPermitidas: string[],
  tiposMimePermitidos?: string[]
): ValidatorFn {

  return (control: AbstractControl) => {

    const arquivo = control.value as File | null;

    // Campo vazio não é responsabilidade desse validator.
    if (!arquivo) {
      return null;
    }

    const nomeArquivo = arquivo.name?.toLowerCase() ?? '';

    const extensao = nomeArquivo.includes('.')
      ? nomeArquivo.split('.').pop()
      : '';

    // Validação da extensão
    if (
      !extensao ||
      !extensoesPermitidas.includes(extensao)
    ) {
      return {
        formatoArquivoInvalido: {
          extensao,
          extensoesPermitidas
        }
      };
    }

    // Validação do MIME, quando informado
    if (
      tiposMimePermitidos &&
      !tiposMimePermitidos.includes(arquivo.type)
    ) {
      return {
        formatoArquivoInvalido: {
          tipoMime: arquivo.type,
          tiposMimePermitidos
        }
      };
    }

    return null;
  };
}

/**
 * Valida arquivos de imagem.
 *
 * Aceitos:
 * JPG, JPEG, PNG e WEBP.
 */
export function validarImagem(): ValidatorFn {
  return validarExtensaoArquivo(
    EXTENSOES_IMAGEM_PERMITIDAS,
    [
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  );
}

/**
 * Valida arquivos de documento.
 *
 * Aceitos:
 * PDF, DOCX e XLSX.
 */
export function validarDocumento(): ValidatorFn {
  return validarExtensaoArquivo(
    EXTENSOES_DOCUMENTO_PERMITIDAS,
    [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  );
}

export function mapearErrosFormulario(
  formGroup: FormGroup,
  mensagensCustomizadas: Record<string, Record<string, string>> = {}
): { [key: string]: string } {

  const erros: { [key: string]: string } = {};

  Object.keys(formGroup.controls).forEach(campo => {

    const controle = formGroup.get(campo);

    if (
      controle &&
      controle.invalid &&
      (controle.dirty || controle.touched)
    ) {

      const primeiroErroAtivo =
        Object.keys(controle.errors!)[0];

      if (mensagensCustomizadas[campo]?.[primeiroErroAtivo]) {

        erros[campo] =
          mensagensCustomizadas[campo][primeiroErroAtivo];

      } else if (MENSAGENS_GENERICAS[primeiroErroAtivo]) {

        erros[campo] =
          MENSAGENS_GENERICAS[primeiroErroAtivo](
            controle.errors![primeiroErroAtivo]
          );

      } else {

        erros[campo] = 'Campo inválido.';
      }
    }
  });

  return erros;
}