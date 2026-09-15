export interface PaginaMetadados {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PaginaResposta<T> {
  content: T[];
  page: PaginaMetadados;
}
