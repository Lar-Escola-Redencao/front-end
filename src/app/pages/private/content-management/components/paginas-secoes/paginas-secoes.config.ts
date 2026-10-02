import {
  GRUPOS_SECAO,
  GrupoSecao,
  ID_PAGINA_GRAFICA,
  ID_PAGINA_PIX,
} from 'src/app/shared/services/pagina/secoes-grupo.contrato';

/**
 * Como cada grupo é exibido:
 * - `formulario`: registro único editado direto na tela, sem adicionar nem
 *   excluir. Salvar cria o registro se ainda não existir.
 * - `tabela`: botão de adicionar + tabela com os itens salvos, editados por
 *   modal. `registroUnico` e `permiteExcluir` restringem esse CRUD.
 */
export type ExibicaoGrupo = 'formulario' | 'tabela';

export interface CampoTextoConfig {
  /** Campo do DTO que recebe o valor. */
  campo: 'titulo' | 'conteudo';
  rotulo: string;
  obrigatorio: boolean;
  /** `telefone` aplica máscara na tela e envia só os dígitos. */
  tipo: 'texto' | 'telefone';
}

export interface CampoImagemConfig {
  rotulo: string;
  /** Obrigatória enquanto o registro ainda não tiver imagem salva. */
  obrigatoria: boolean;
}

export interface GrupoSecaoConfig {
  grupo: GrupoSecao;
  /** Texto da aba; só aparece quando a página tem mais de um grupo. */
  rotuloAba: string;
  exibicao: ExibicaoGrupo;
  /** Nome do item no singular, como aparece no meio de uma frase (títulos e mensagens). */
  nomeItem: string;
  /** Só os campos listados aqui são enviados — o resto do DTO fica de fora. */
  campos: CampoTextoConfig[];
  imagem?: CampoImagemConfig;
  /**
   * Só na exibição `tabela`: o back guarda um único registro do grupo
   * (POST é upsert), então o botão de adicionar some depois do primeiro.
   */
  registroUnico?: boolean;
  /** Só na exibição `tabela`: mostra a ação de excluir (padrão: true). */
  permiteExcluir?: boolean;
  /** Só na exibição `tabela`: imagem antes dos campos de texto, na tabela e no modal. */
  imagemPrimeiro?: boolean;
}

export interface PaginaSecoesConfig {
  /** Segmento da rota /dashboard/conteudo-publico/:secao. */
  secao: string;
  /** Texto exibido no dropdown do CMS. */
  rotulo: string;
  idPagina: number;
  grupos: GrupoSecaoConfig[];
}

export const PAGINAS_SECOES_CONFIG: PaginaSecoesConfig[] = [
  {
    secao: 'grafica',
    rotulo: 'Gráfica',
    idPagina: ID_PAGINA_GRAFICA,
    grupos: [
      {
        grupo: GRUPOS_SECAO.telefone,
        rotuloAba: 'Telefone',
        exibicao: 'formulario',
        nomeItem: 'telefone',
        campos: [
          { campo: 'titulo', rotulo: 'WhatsApp', obrigatorio: true, tipo: 'telefone' },
          {
            campo: 'conteudo',
            rotulo: 'Telefone alternativo',
            obrigatorio: false,
            tipo: 'telefone',
          },
        ],
      },
      {
        grupo: GRUPOS_SECAO.produtos,
        rotuloAba: 'Produtos',
        exibicao: 'tabela',
        nomeItem: 'produto',
        campos: [{ campo: 'titulo', rotulo: 'Nome do produto', obrigatorio: true, tipo: 'texto' }],
        imagem: { rotulo: 'Imagem do produto', obrigatoria: true },
      },
    ],
  },
  {
    secao: 'pix',
    rotulo: 'Pix',
    idPagina: ID_PAGINA_PIX,
    grupos: [
      {
        grupo: GRUPOS_SECAO.pix,
        rotuloAba: 'Pix',
        exibicao: 'tabela',
        nomeItem: 'Pix',
        registroUnico: true,
        permiteExcluir: false,
        imagemPrimeiro: true,
        campos: [{ campo: 'conteudo', rotulo: 'Chave Pix', obrigatorio: true, tipo: 'texto' }],
        imagem: { rotulo: 'QR Code', obrigatoria: true },
      },
    ],
  },
];
