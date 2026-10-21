export type TipoRegistroHistorico =
  | 'COLABORADORES'
  | 'USUARIOS'
  | 'CONTATOS'
  | 'VINCULOS_CONTATOS'
  | 'PRESENCAS'
  | 'OCORRENCIAS';

export type TipoAlteracaoHistorico = 'CADASTRO' | 'EDICAO' | 'EXCLUSAO';

export type ValorHistorico =
  | string
  | number
  | boolean
  | null
  | ValorHistorico[]
  | { [campo: string]: ValorHistorico };

export interface FiltrosHistorico {
  idRegistro?: number | null;
  idResponsavel?: number | null;
  dataInicial?: string;
  dataFinal?: string;
  tipoAlteracao?: TipoAlteracaoHistorico | '';
  dataAula?: string;
}

export interface HistoricoEvento {
  id: number;
  revisao: number;
  dataHora: string;
  idResponsavel: number | null;
  nomeResponsavel: string;
  tipoRegistro: TipoRegistroHistorico;
  informacaoAlterada: string;
  idRegistro: number | null;
  identificacaoRegistro: string;
  registroExcluido: boolean;
  tipoAlteracao: TipoAlteracaoHistorico;
}

export interface CampoHistorico {
  campo: string;
  nome: string;
  valorAnterior: ValorHistorico;
  valorNovo: ValorHistorico;
  anteriorConhecido: boolean;
}

export interface HistoricoDetalhe {
  evento: HistoricoEvento;
  identificadorEspecifico: string;
  referenciaAnteriorDisponivel: boolean;
  observacao: string | null;
  contextoAnterior: Record<string, ValorHistorico>;
  contextoNovo: Record<string, ValorHistorico>;
  campos: CampoHistorico[];
}
