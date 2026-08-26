export interface SocialLink {
  id: number;
  nome: string;
  url: string;
  icone: string;
  ativo: boolean;
}

export interface SocialLinkInput {
  nome: string;
  url: string;
  icone: File | null;
  ativo?: boolean;
}
