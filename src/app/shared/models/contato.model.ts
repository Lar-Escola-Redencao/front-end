export interface ContatoListagemDTO {
  id: number;
  nomeCompleto: string;
  telefone: string;
  email: string;
  endereco: string;
  quantidadeVinculos: number;
}

export interface ContatoDTO {
  id?: number;
  nomeCompleto: string;
  telefone: string;
  email?: string;
  endereco?: string;
  parentesco: string;
  principal: boolean;
}

export interface ContatoResponseDTO {
  id: number;
  nomeCompleto: string;
  telefone: string;
  email: string;
  endereco: string;
  parentesco: string;
  principal: boolean;
}
