export interface Colaborador {
  id: number;
  nomeCompleto: string;
  email: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
  nomePapel: string;
  unidades: { id: number, nome: string }[];
  ativo: boolean;
}

export interface CriarColaboradorDTO {
  nomeCompleto: string;
  email: string;
  senha?: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
  idsUnidades: number[];
}

export interface AtualizarColaboradorDTO {
  nomeCompleto: string;
  email: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
  idsUnidades: number[];
}

/** Dados revisados e nova senha, enviados juntos para reativar o acesso. */
export interface ReativarColaboradorDTO extends AtualizarColaboradorDTO {
  senha: string;
  confirmacaoSenha: string;
}

export type SituacaoColaborador = 'ativos' | 'inativos' | 'todos';
