export interface Partner {
  id: number;
  nome: string;
  logo: string;
  ativo: boolean;
}

export interface PartnerInput {
  nome: string;
  logo: File | null;
  ativo?: boolean;
}
