export interface Evento {
  id: number;
  titulo: string;
  descricao: string;
  dataEvento: Date;
  endereco: string;
  imagem: string;
  valor?: number;
  tipoEvento: TipoEvento;
  // Calculado pelo back a partir da dataEvento.
  encerrado?: boolean;
  comentarioPosEvento?: string;
  parceiros: Parceiro[];
  // Redes sociais de cobertura deste evento especificamente (GET /evento/{id}/redes-sociais).
  redesSociais?: EventoRedeSocial[];
}

export interface EventoRedeSocial {
  idRedeSocial: number;
  nome: string;
  icone: string;
  urlLink: string;
}

// Link do evento em uma rede social (tabela evento_rede_social), usado no pós-evento.
export interface EventoRedeSocial {
  idRedeSocial: number;
  nome: string;
  icone: string;
  urlLink: string;
}

export interface VincularRedeSocialEventoDTO {
  idRedeSocial: number;
  // Opcional: vazio faz o back usar a url cadastrada na própria rede social.
  urlLink?: string;
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
