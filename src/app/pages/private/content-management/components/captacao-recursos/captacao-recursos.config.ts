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
  campo: 'titulo' | 'conteudo';
  rotulo: string;
  obrigatorio: boolean;
  tipo: 'texto' | 'telefone' | 'telefoneOuEmail';
}

export interface CampoImagemConfig {
  rotulo: string;
  obrigatoria: boolean;
}

export interface GrupoSecaoConfig {
  grupo: GrupoSecao;
  rotuloAba: string;
  exibicao: ExibicaoGrupo;
  nomeItem: string;
  campos: CampoTextoConfig[];
  imagem?: CampoImagemConfig;
  registroUnico?: boolean;
  permiteExcluir?: boolean;
  imagemPrimeiro?: boolean;
  controlaAtivo?: boolean;
}

export interface CaptacaoRecursosConfig {
  secao: string;
  rotulo: string;
  idPagina: number;
  grupos: GrupoSecaoConfig[];
}

export const CAPTACAO_RECURSOS_CONFIG: CaptacaoRecursosConfig[] = [
  {
    secao: 'grafica',
    rotulo: 'Gráfica',
    idPagina: ID_PAGINA_GRAFICA,
    grupos: [
      {
        grupo: GRUPOS_SECAO.produtos,
        rotuloAba: 'Produtos e serviços',
        exibicao: 'tabela',
        nomeItem: 'produto ou serviço',
        campos: [
          {
            campo: 'titulo',
            rotulo: 'Nome do produto ou serviço',
            obrigatorio: true,
            tipo: 'texto',
          },
        ],
        imagem: {
          rotulo: 'Imagem do produto ou serviço',
          obrigatoria: true,
        },
        controlaAtivo: true,
      },
      {
        grupo: GRUPOS_SECAO.telefone,
        rotuloAba: 'Contato',
        exibicao: 'formulario',
        nomeItem: 'contato',
        campos: [
          {
            campo: 'titulo',
            rotulo: 'WhatsApp',
            obrigatorio: true,
            tipo: 'telefone',
          },
          {
            campo: 'conteudo',
            rotulo: 'Contato secundário (Telefone ou E-mail)',
            obrigatorio: false,
            tipo: 'telefoneOuEmail',
          },
        ],
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
        controlaAtivo: true,
        campos: [
          {
            campo: 'conteudo',
            rotulo: 'Chave Pix',
            obrigatorio: true,
            tipo: 'texto',
          },
        ],
      },
    ],
  },
];
