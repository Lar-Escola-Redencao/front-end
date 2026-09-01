export interface Unidade {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  diasFuncionamento: string;
  horarioAbertura: string;
  horarioFechamento: string;
  idadeMin: number;
  idadeMax: number;
  corHex: string;
}

export interface CriarUnidadeDTO {
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  diasFuncionamento: string;
  horarioAbertura: string;
  horarioFechamento: string;
  idadeMin: number;
  idadeMax: number;
  corHex?: string;
}

export interface AtualizarUnidadeDTO extends CriarUnidadeDTO {}
