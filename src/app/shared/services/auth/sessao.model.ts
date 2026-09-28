export interface UnidadeResumoDTO {
  id: number;
  nome: string;
  [key: string]: any;
}

export interface MembroLogadoDTO {
  id: number;
  nomeCompleto: string;
  email: string;
  cpf: string;
  endereco?: string;
  telefone?: string;
  idPapel: number;
  nomePapel: string;
  unidades: UnidadeResumoDTO[];
}

export const Papel = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  COORDENADOR: 'COORDENADOR',
  MONITOR: 'MONITOR'
} as const;

export type PapelNome = typeof Papel[keyof typeof Papel];
