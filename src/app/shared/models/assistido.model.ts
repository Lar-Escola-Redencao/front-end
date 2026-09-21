import { ContatoDTO, ContatoResponseDTO } from './contato.model';

export interface CriarAssistidoDTO {
  nomeCompleto: string;
  dataNascimento: string | Date;
  cpf?: string | null;
  documentoAuxiliar?: string | null;
  tipoDocumento?: string | null;
  endereco?: string;
  idTurma: number;
  contatos: ContatoDTO[];
}

export interface AssistidoResponseDTO {
  id: number;
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string;
  documentoAuxiliar?: string;
  tipoDocumento?: string;
  endereco?: string;
  foto?: string;
  contatos?: ContatoResponseDTO[];

  idTurma?: number;
  idUnidade?: number;
}
