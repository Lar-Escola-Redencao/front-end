import { environment } from 'src/environments/environment';

/**
 * Contrato do PaginaController/PaginaService para as seções identificadas por
 * `grupo` (Gráfica e Pix). Qualquer ajuste de rota, de nome de campo do DTO ou
 * do nome da parte do arquivo deve ser feito só aqui.
 */

/** Ids fixos das páginas institucionais cadastradas no banco. */
export const ID_PAGINA_GRAFICA = 3;
export const ID_PAGINA_PIX = 4;

/** Valores do campo `grupo` — sempre fixados pelo código, nunca digitados. */
export const GRUPOS_SECAO = {
  telefone: 'telefone',
  produtos: 'produtos',
  pix: 'pix',
} as const;

export type GrupoSecao = (typeof GRUPOS_SECAO)[keyof typeof GRUPOS_SECAO];

const urlPaginas = `${environment.apiUrl}/paginas`;
const urlSecoes = (idPagina: number) => `${urlPaginas}/${idPagina}/secoes`;

export const CONTRATO_SECOES_GRUPO = {
  rotas: {
    /** Lista simples (sem paginação) com todas as seções da página, ativas ou não. */
    listar: (idPagina: number) => urlSecoes(idPagina),
    /** Para os grupos `telefone` e `pix`, o back trata o POST como upsert. */
    criar: (idPagina: number) => urlSecoes(idPagina),
    /** Escopado pela página: seção de outra página responde 404. */
    atualizar: (idPagina: number, id: number) => `${urlSecoes(idPagina)}/${id}`,
    /** O back só expõe a exclusão pelo id da seção, sem o id da página. */
    excluir: (id: number) => `${urlPaginas}/secoes/${id}`,
  },

  /** Nomes dos campos enviados no multipart/form-data. */
  camposEnvio: {
    titulo: 'titulo',
    conteudo: 'conteudo',
    grupo: 'grupo',
  },

  /** Nome da parte do multipart que carrega o arquivo. */
  parteArquivo: 'imagem',

  /** Limites do `titulo` no DTO do back (@Size(min = 3, max = 150)). */
  tamanhoTitulo: { minimo: 3, maximo: 150 },

  /** Nomes dos campos lidos na resposta do back. */
  camposResposta: {
    id: 'id',
    titulo: 'titulo',
    conteudo: 'conteudo',
    imagem: 'imagem',
    grupo: 'grupo',
  },
} as const;
