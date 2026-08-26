export interface Membro {
  id: number;
  nomeCompleto: string;
  email: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
  nomePapel: string;
}

export interface CriarMembroDTO {
  nomeCompleto: string;
  email: string;
  senha?: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
}

export interface AtualizarMembroDTO {
  nomeCompleto: string;
  email: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
}
