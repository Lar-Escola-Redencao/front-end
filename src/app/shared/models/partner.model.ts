export interface Partner {
  id: number;
  name: string;
  logoUrl: string;
  active: boolean;
}

export type PartnerInput = Omit<Partner, 'id'>;
