export interface ContatoDTO {
  id?: number | null;
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
  email?: string;
  endereco?: string;
  parentesco?: string;
  principal?: boolean;
}

export interface ContatoListagemDTO {
  id: number;
  nomeCompleto: string;
  telefone: string;
  email?: string;
  endereco?: string;
  quantidadeVinculos: number;
}

/** Um dos usuários vinculados a um contato (modal "Usuários vinculados"). */
export interface UsuarioVinculadoDTO {
  idUsuario: number;
  nomeCompleto: string;
  parentesco: string;
  principal: boolean;
  idUnidade?: number;
  nomeUnidade?: string;
  imagemPerfil?: string;
}

/** Detalhe completo de um contato, incluindo todos os usuários vinculados a ele. */
export interface ContatoDetalheDTO extends ContatoListagemDTO {
  vinculos: UsuarioVinculadoDTO[];
}

export interface AtualizarContatoDTO {
  nomeCompleto: string;
  telefone: string;
  email?: string;
  endereco?: string;
}

export interface VincularContatoExistenteDTO {
  parentesco: string;
  principal: boolean;
}

export interface AtualizarVinculoDTO {
  parentesco: string;
  principal: boolean;
}
