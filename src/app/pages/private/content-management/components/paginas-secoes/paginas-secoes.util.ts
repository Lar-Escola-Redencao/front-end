import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';

import { CONTRATO_SECOES_GRUPO } from 'src/app/shared/services/pagina/secoes-grupo.contrato';
import {
  SalvarSecaoGrupoDTO,
  SecaoGrupo,
} from 'src/app/shared/services/pagina/secoes-grupo.service';
import {
  validarImagem,
  validarObrigatorioSemEspacos,
  validarTelefone,
} from 'src/app/shared/utils/form-validations';
import { formatarTelefone } from 'src/app/shared/utils/masks';
import { environment } from 'src/environments/environment';

import { CampoTextoConfig, GrupoSecaoConfig } from './paginas-secoes.config';

/** Nome do controle de arquivo nos formulários (o nome enviado ao back vem do contrato). */
export const CONTROLE_IMAGEM = 'imagem';

export const MENSAGEM_IMAGEM_OBRIGATORIA = 'Selecione uma imagem.';

/** "(00) 00000-0000" */
const TAMANHO_TELEFONE_MASCARADO = 15;

/** Monta o FormGroup só com os campos que o grupo usa, a partir da configuração. */
export function criarFormularioGrupo(fb: FormBuilder, grupo: GrupoSecaoConfig): FormGroup {
  const controles: Record<string, [unknown, ValidatorFn[]]> = {};

  for (const campo of grupo.campos) {
    const validadores: ValidatorFn[] = [];

    if (campo.obrigatorio) {
      validadores.push(validarObrigatorioSemEspacos());
    }

    if (campo.tipo === 'telefone') {
      validadores.push(validarTelefone());
    } else if (campo.campo === 'titulo') {
      const { minimo, maximo } = CONTRATO_SECOES_GRUPO.tamanhoTitulo;
      validadores.push(Validators.minLength(minimo), Validators.maxLength(maximo));
    }

    controles[campo.campo] = ['', validadores];
  }

  if (grupo.imagem) {
    controles[CONTROLE_IMAGEM] = [null, [validarImagem()]];
  }

  return fb.group(controles);
}

/** Valores do formulário a partir da seção salva (ou vazio, quando ainda não existe). */
export function valoresIniciaisGrupo(
  grupo: GrupoSecaoConfig,
  secao: SecaoGrupo | null,
): Record<string, unknown> {
  const valores: Record<string, unknown> = {};

  for (const campo of grupo.campos) {
    const valor = secao?.[campo.campo] ?? '';
    valores[campo.campo] = campo.tipo === 'telefone' ? formatarTelefone(valor) : valor;
  }

  if (grupo.imagem) {
    valores[CONTROLE_IMAGEM] = null;
  }

  return valores;
}

/** Só os campos de texto, pra comparar com o estado original sem o File. */
export function valoresTextoGrupo(grupo: GrupoSecaoConfig, form: FormGroup): string {
  return JSON.stringify(grupo.campos.map((campo) => form.get(campo.campo)?.value ?? ''));
}

/**
 * `grupo` vem sempre da configuração; campos que o grupo não usa ficam de fora.
 * Telefones vão só com dígitos.
 */
export function montarDtoGrupo(
  grupo: GrupoSecaoConfig,
  form: FormGroup,
  arquivo: File | null,
): SalvarSecaoGrupoDTO {
  const dto: SalvarSecaoGrupoDTO = { grupo: grupo.grupo };

  for (const campo of grupo.campos) {
    const texto = String(form.get(campo.campo)?.value ?? '');
    dto[campo.campo] = campo.tipo === 'telefone' ? texto.replace(/\D/g, '') : texto.trim();
  }

  if (grupo.imagem && arquivo) {
    dto.imagem = arquivo;
  }

  return dto;
}

/**
 * Passa o arquivo pelo validarImagem() do controle. Devolve false (e limpa o
 * controle mantendo o erro visível) quando o arquivo é recusado.
 */
export function registrarArquivo(form: FormGroup, arquivo: File): boolean {
  const controle = form.get(CONTROLE_IMAGEM);

  if (!controle) {
    return false;
  }

  controle.setValue(arquivo);
  controle.markAsDirty();
  controle.markAsTouched();
  controle.updateValueAndValidity();

  return controle.valid;
}

export function imagemObrigatoriaPendente(
  grupo: GrupoSecaoConfig,
  imagemSalva: string | null | undefined,
  arquivo: File | null,
): boolean {
  return !!grupo.imagem?.obrigatoria && !imagemSalva && !arquivo;
}

/** `maxlength` do input: telefone mascarado ou limite do `titulo` no back. */
export function limiteCaracteres(campo: CampoTextoConfig): number | null {
  if (campo.tipo === 'telefone') {
    return TAMANHO_TELEFONE_MASCARADO;
  }

  return campo.campo === 'titulo' ? CONTRATO_SECOES_GRUPO.tamanhoTitulo.maximo : null;
}

export function aplicarMascaraTelefone(controle: AbstractControl | null): void {
  if (!controle) {
    return;
  }

  const formatado = formatarTelefone(controle.value);

  if (formatado !== controle.value) {
    controle.setValue(formatado, { emitEvent: false });
  }
}

/** Mesma regra das demais seções do CMS: caminho relativo ganha o apiUrl na frente. */
export function resolverUrlImagem(caminho: string | null | undefined): string | null {
  if (!caminho) {
    return null;
  }

  if (/^(https?:|data:)/.test(caminho)) {
    return caminho;
  }

  return `${environment.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface ErrosApi {
  /** Erros associados a um controle do formulário, prontos pra exibir no campo. */
  erros: Record<string, string>;
  /** Mensagem geral (toast), quando o erro não ficou todo associado a campos da tela. */
  mensagem: string | null;
}

/** Chaves do corpo de erro do GlobalExceptionHandler que não são campos do DTO. */
const CHAVES_GERAIS_ERRO = ['message', 'status'];

/**
 * Lê a resposta de erro do GlobalExceptionHandler do back:
 * - @Valid: { campo: mensagem, ..., message: 'mensagens agrupadas' } → erros nos campos;
 * - regra de negócio (ResponseStatusException): { message, status } → toast.
 */
export function extrairErrosApi(err: any, grupo: GrupoSecaoConfig): ErrosApi {
  const corpo = err?.error;
  const erros: Record<string, string> = {};
  const outrasMensagens: string[] = [];

  if (err?.status === 400 && corpo && typeof corpo === 'object') {
    const { camposEnvio, parteArquivo } = CONTRATO_SECOES_GRUPO;
    const controlePorCampo: Record<string, string> = {
      [camposEnvio.titulo]: 'titulo',
      [camposEnvio.conteudo]: 'conteudo',
      [parteArquivo]: CONTROLE_IMAGEM,
    };

    const controlesDoGrupo = [
      ...grupo.campos.map((campo) => campo.campo as string),
      ...(grupo.imagem ? [CONTROLE_IMAGEM] : []),
    ];

    for (const [chave, valor] of Object.entries(corpo)) {
      if (typeof valor !== 'string' || CHAVES_GERAIS_ERRO.includes(chave)) {
        continue;
      }

      const controle = controlePorCampo[chave];

      if (controle && controlesDoGrupo.includes(controle)) {
        erros[controle] = valor;
      } else {
        outrasMensagens.push(valor);
      }
    }
  }

  // O `message` do @Valid só repete os erros de campo; vira toast quando
  // nenhum erro pôde ser mostrado no formulário.
  let mensagem: string | null = null;

  if (outrasMensagens.length) {
    mensagem = outrasMensagens.join(' ');
  } else if (!Object.keys(erros).length && typeof corpo?.message === 'string') {
    mensagem = corpo.message;
  }

  return { erros, mensagem };
}
