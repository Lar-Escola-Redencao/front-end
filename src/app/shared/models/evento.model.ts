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
  // TODO: ainda não existe no back-end. Quando a galeria de mídias do evento
  // (tabela midia_evento) for implementada, o endpoint GET /evento/{id} deve
  // passar a retornar esta lista de URLs de imagens extras do evento.
  midiaEvento?: string[];
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
