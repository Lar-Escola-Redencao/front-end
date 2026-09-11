export interface Documento {
  id: number;
  titulo: string;
  arquivo: string;
}

export interface Secao {
  id: number;
  titulo: string;
  conteudo?: string;
  imagem?: string;
  ativo: boolean;
  documentos: Documento[];
}
