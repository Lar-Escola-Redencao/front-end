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
  // Fotos da cobertura pós-evento (tabela midia_evento), já resolvidas para URLs
  // pelo EventoPublicoService a partir do array de objetos retornado pela API.
  midiaEvento?: MidiaEvento[];
}

export type TipoMidiaEvento = 'IMAGEM' | 'VIDEO';

export interface MidiaEvento {
  url: string;
  tipo: TipoMidiaEvento;
}

export interface MidiaEventoDTO {
  id: number;
  tipoMidia?: TipoMidiaEvento;
  urlMidia?: string;
  tipo_midia?: TipoMidiaEvento;
  url_midia?: string;
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
