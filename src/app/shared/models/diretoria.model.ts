export interface Diretoria {
  id: number;
  nome: string;
  cargo: string;
  foto: string;
  ativo: boolean;
}

export interface CriarDiretoriaDTO {
  nome: string;
  cargo: string;
  foto?: File | null;
}

export interface AtualizarDiretoriaDTO {
  nome: string;
  cargo: string;
  ativo: boolean;
  foto?: File | null;
}
