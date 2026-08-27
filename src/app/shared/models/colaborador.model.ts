export interface Colaborador {
  id: number;
  nomeCompleto: string;
  email: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
  nomePapel: string;
}

export interface CriarColaboradorDTO {
  nomeCompleto: string;
  email: string;
  senha?: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
}

export interface AtualizarColaboradorDTO {
  nomeCompleto: string;
  email: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
}
