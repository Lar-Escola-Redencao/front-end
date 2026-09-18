
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidatorFn
} from '@angular/forms';


// =========================================================
// MENSAGENS GENÉRICAS
// =========================================================

const MENSAGENS_GENERICAS: Record<string, (err: any) => string> = {

  required: () =>
    'Este campo é obrigatório.',

  minlength: (err) =>
    `Mínimo de ${err.requiredLength} caracteres.`,

  maxlength: (err) =>
    `Máximo de ${err.requiredLength} caracteres.`,

  email: () =>
    'Digite um e-mail válido.',

  min: (err) =>
    `O valor não pode ser menor que ${err.min}.`,

  pattern: () =>
    'Formato inválido.',

  senhasDiferentes: () =>
    'As senhas não coincidem.',

  formatoArquivoInvalido: () =>
    'Formato de arquivo inválido.',

  tamanhoArquivoExcedido: (err) =>
    `O arquivo deve ter no máximo ${err.tamanhoMaximoMB}MB.`,

  anoInvalido: () =>
    'O título deve ser um ano com 4 dígitos (ex.: 2015).'

};


// =========================================================
// CONFIGURAÇÕES DE ARQUIVOS
// =========================================================

/**
 * Tamanho máximo padrão dos arquivos.
 */
export const TAMANHO_MAXIMO_ARQUIVO_MB = 10;

export const TAMANHO_MAXIMO_ARQUIVO_BYTES =
  TAMANHO_MAXIMO_ARQUIVO_MB * 1024 * 1024;


// =========================================================
// EXTENSÕES PERMITIDAS
// =========================================================

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


// =========================================================
// VALIDAÇÃO DE EXTENSÃO E MIME
// =========================================================

/**
 * Valida extensão, MIME e tamanho de um arquivo.
 *
 * Campo vazio não é responsabilidade deste validator.
 */
export function validarExtensaoArquivo(
  extensoesPermitidas: string[],
  tiposMimePermitidos?: string[],
  tamanhoMaximoBytes: number =
    TAMANHO_MAXIMO_ARQUIVO_BYTES
): ValidatorFn {

  return (control: AbstractControl) => {

    const arquivo =
      control.value as File | null;


    // -------------------------------------------------------
    // CAMPO VAZIO
    // -------------------------------------------------------

    if (!arquivo) {
      return null;
    }


    // -------------------------------------------------------
    // EXTENSÃO
    // -------------------------------------------------------

    const nomeArquivo =
      arquivo.name?.toLowerCase() ?? '';

    const extensao =
      nomeArquivo.includes('.')
        ? nomeArquivo.split('.').pop()
        : '';


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


    // -------------------------------------------------------
    // MIME
    // -------------------------------------------------------

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


    // -------------------------------------------------------
    // TAMANHO
    // -------------------------------------------------------
    if (
      arquivo.size > tamanhoMaximoBytes
    ) {
      return {
        tamanhoArquivoExcedido: {
          tamanhoArquivo: arquivo.size,
          tamanhoMaximoBytes,
          tamanhoMaximoMB:
            tamanhoMaximoBytes /
            (1024 * 1024)
        }
      };

    }
    return null;
  };
}


// =========================================================
// VALIDAÇÃO DE IMAGEM
// =========================================================

/**
 * Valida arquivos de imagem.
 *
 * Aceitos:
 * JPG, JPEG, PNG e WEBP.
 *
 * Tamanho máximo:
 * 10MB.
 */
export function validarImagem(): ValidatorFn {
  return validarExtensaoArquivo(
    EXTENSOES_IMAGEM_PERMITIDAS,
    [
      'image/jpeg',
      'image/png',
      'image/webp'
    ],
    TAMANHO_MAXIMO_ARQUIVO_BYTES
  );
}


// =========================================================
// VALIDAÇÃO DE DOCUMENTO
// =========================================================

/**
 * Valida arquivos de documento.
 *
 * Aceitos:
 * PDF, DOCX e XLSX.
 *
 * Tamanho máximo:
 * 10MB.
 */
export function validarDocumento(): ValidatorFn {
  return validarExtensaoArquivo(
    EXTENSOES_DOCUMENTO_PERMITIDAS,
    [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    TAMANHO_MAXIMO_ARQUIVO_BYTES
  );
}


// =========================================================
// VALIDAÇÃO DE ANO
// =========================================================

/**
 * Ano mínimo aceito pro título de um bloco de "Nossa História".
 */
export const ANO_MINIMO = 1900;

/**
 * Valida que o título é um ano com 4 dígitos, dentro de uma faixa razoável
 * (de ANO_MINIMO até o ano que vem). É esse ano que ordena a linha do
 * tempo pública, então não aceita texto livre tipo "2015 - fundação".
 *
 * Campo vazio não é responsabilidade deste validator.
 */
export function validarAno(): ValidatorFn {
  return (control: AbstractControl) => {
    const valor = String(control.value ?? '').trim();

    if (!valor) {
      return null;
    }

    if (!/^\d{4}$/.test(valor)) {
      return { anoInvalido: { valor } };
    }

    const ano = Number(valor);
    const anoMaximo = new Date().getFullYear() + 1;

    if (ano < ANO_MINIMO || ano > anoMaximo) {
      return { anoInvalido: { valor, anoMinimo: ANO_MINIMO, anoMaximo } };
    }

    return null;
  };
}


// =========================================================
// VALIDAR FILE DIRETAMENTE
// =========================================================

/**
 * Executa um ValidatorFn diretamente sobre um File.
 *
 * Útil para inputs type="file", onde o arquivo ainda
 * não está necessariamente dentro de um FormControl.
 */
export function validarArquivo(
  arquivo: File,
  validator: ValidatorFn
): Record<string, any> | null {
  const control =
    new FormControl(arquivo);
  return validator(control);
}


// =========================================================
// OBTER MENSAGEM DE ERRO
// =========================================================

/**
 * Converte um erro de validação em uma mensagem amigável.
 *
 * Usa as mesmas mensagens do mapearErrosFormulario().
 */
export function obterMensagemErro(
  erros: Record<string, any> | null | undefined
): string {

  if (!erros) {
    return '';
  }

  const primeiroErro =
    Object.keys(erros)[0];

  if (!primeiroErro) {
    return '';
  }

  const mensagem =
    MENSAGENS_GENERICAS[primeiroErro];

  if (mensagem) {
    return mensagem(
      erros[primeiroErro]
    );
  }

  return 'Campo inválido.';

}


// =========================================================
// MAPEAR ERROS DO FORMULÁRIO
// =========================================================

export function mapearErrosFormulario(
  formGroup: FormGroup,
  mensagensCustomizadas:
    Record<string, Record<string, string>> = {}
): { [key: string]: string } {

  const erros: {
    [key: string]: string
  } = {};

  Object.keys(
    formGroup.controls
  ).forEach(campo => {

    const controle =
      formGroup.get(campo);

    if (
      controle &&
      controle.invalid &&
      (
        controle.dirty ||
        controle.touched
      )
    ) {
      const primeiroErroAtivo =
        Object.keys(
          controle.errors!
        )[0];

      // -----------------------------------------------------
      // MENSAGEM CUSTOMIZADA
      // -----------------------------------------------------

      if (
        mensagensCustomizadas[campo]
          ?.[primeiroErroAtivo]
      ) {

        erros[campo] =
          mensagensCustomizadas[campo]
            [primeiroErroAtivo];

      }

      // -----------------------------------------------------
      // MENSAGEM GENÉRICA
      // -----------------------------------------------------

      else if (
        MENSAGENS_GENERICAS[
          primeiroErroAtivo
        ]
      ) {
        erros[campo] =
          MENSAGENS_GENERICAS[
            primeiroErroAtivo
          ](
            controle.errors![
              primeiroErroAtivo
            ]
          );
      }

      // -----------------------------------------------------
      // FALLBACK
      // -----------------------------------------------------

      else {
        erros[campo] =
          'Campo inválido.';
      }
    }
  });
  return erros;
}