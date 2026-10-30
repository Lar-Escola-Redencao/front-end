export interface Perfil {
  id: number;
  nomeCompleto: string;
  email: string;
  cpf: string;
  endereco: string;
  telefone: string;
  idPapel: number;
  nomePapel: string;
  unidades: { id: number; nome: string }[];
}

/**
 * CPF e e-mail são opcionais e editáveis somente pelo próprio administrador.
 * Papel e unidades não são alteráveis por este contrato.
 */
export interface AtualizarPerfilDTO {
  nomeCompleto: string;
  endereco: string;
  telefone: string;
  email?: string;
  cpf?: string;
}
