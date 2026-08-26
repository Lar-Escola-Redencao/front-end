export interface Evento {
  id: number;
  titulo: string;
  descricao: string;
  dataEvento: Date;
  endereco: string;
  imagem: string;
  valor?: number;
  tipoEvento: TipoEvento;
  comentarioPosEvento?: string;
  parceiros: Parceiro[];
}

export interface CriarEventoDTO {
  titulo: string;
  descricao: string;
  dataEvento: string | Date;
  endereco: string;
  imagem?: File;
  valor?: number;
  tipoEvento: TipoEvento;
  parceirosIds?: number[];
}

export interface AtualizarEventoDTO {
  titulo?: string;
  descricao?: string;
  dataEvento?: string | Date;
  endereco?: string;
  imagem?: File;
  valor?: number;
  tipoEvento?: TipoEvento;
  comentarioPosEvento?: string;
  parceirosIds?: number[];
}

export enum TipoEvento {
  ARRECADACAO  = 'ARRECADACAO',
  CULTURAL     = 'CULTURAL',
  COMEMORATIVO = 'COMEMORATIVO'
}

export interface Parceiro {
  id: number;
  nome: string;
  logo: string;
}
