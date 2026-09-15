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
 * Por ora só nome, endereço e telefone são editáveis pelo próprio usuário.
 * E-mail, cpf, papel e unidades são somente leitura na tela de perfil.
 */
export interface AtualizarPerfilDTO {
  nomeCompleto: string;
  endereco: string;
  telefone: string;
}
