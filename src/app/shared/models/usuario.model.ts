import { ContatoDTO, ContatoResponseDTO } from './contato.model';

export interface ComposicaoFamiliarDTO {
  nomeCompleto: string;
  parentescoVinculo: string;
  idade?: number | null;
  escolaridade: string;
  renda?: number | null;
  beneficios?: number | null;
}

export interface FichaSocioeconomicaDTO {
  tipoMoradia: string;
  valorAluguel?: number | null;
  valorFinanciamento?: number | null;
  despesaEnergia?: number | null;
  despesaAgua?: number | null;
  despesaInternet?: number | null;
  despesaTelefone?: number | null;
  despesaMercado?: number | null;
  despesaFarmacia?: number | null;
  despesaFinanciamentos?: number | null;
  despesaOutras?: number | null;
  utilizaCarro?: boolean;
  gastoCarro?: number | null;
  utilizaMoto?: boolean;
  gastoMoto?: number | null;
  utilizaTransportePublico?: boolean;
  gastoTransportePublico?: number | null;
  utilizaVan?: boolean;
  gastoVan?: number | null;
  andandoOuBicicleta?: boolean;
  religiao?: string;
  possuiProblemaSaude?: boolean;
  descProblemaSaude?: string;
  usaMedicacao?: boolean;
  descMedicacao?: string;
  temAlergia?: boolean;
  descAlergia?: string;
}

export interface CadastroUsuarioCompletoDTO {
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string | null;
  documentoAuxiliar?: string | null;
  tipoDocumento?: string | null;
  cadUnico?: string;
  endereco: string;
  bairro: string;
  cep?: string;
  escola: string;
  periodoEscolar: string;
  serieEscolar: string;
  raEscolar?: string;
  idTurma: number;
  contatos: ContatoDTO[];
  composicaoFamiliar: ComposicaoFamiliarDTO[];
  fichaSocioeconomica: FichaSocioeconomicaDTO;
}

export interface UsuarioResponseDTO {
  id: number;
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string;
  documentoAuxiliar?: string;
  tipoDocumento?: string;
  cadUnico?: string;
  endereco?: string;
  bairro?: string;
  cep?: string;
  escola?: string;
  periodoEscolar?: string;
  serieEscolar?: string;
  raEscolar?: string;
  imagemPerfil?: string;
  contatos?: ContatoResponseDTO[];
  composicaoFamiliar?: ComposicaoFamiliarDTO[] | null;
  fichaSocioeconomica?: FichaSocioeconomicaDTO | null;
  idTurma?: number;
  idUnidade?: number;
  nomeTurma?: string;
  nomeUnidade?: string;
  dataIngresso?: string;
  dataDesligamento?: string;
  justificativaEgresso?: string;
  periodo?: string;
  status?: string;
  statusMatricula?: string;
}

export interface ArquivoSaudeDTO {
  id: number;
  titulo: string;
  caminhoArquivo?: string;
}
