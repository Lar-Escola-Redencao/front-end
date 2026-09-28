export interface Documento {
  id: number;
  titulo: string;
  arquivo: string;
}

export interface Secao {
  id: number;
  titulo: string;
  grupo?: string;
  ordem?: number;
  conteudo?: string;
  imagem?: string;
  ativo: boolean;
  documentos: Documento[];
}
