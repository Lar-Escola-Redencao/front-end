import { Injectable, computed, signal } from '@angular/core';
import { Partner, PartnerInput } from '../../../shared/models/partner.model';

const INITIAL_PARTNERS: Partner[] = [
  { id: 1, name: 'Cutrale', logoUrl: '', active: false },
  { id: 2, name: 'Lupo', logoUrl: '', active: true },
  { id: 3, name: 'Nigro', logoUrl: '', active: true },
  { id: 4, name: 'JBT', logoUrl: '', active: false },
  { id: 5, name: 'IFSP Araraquara', logoUrl: '', active: true },
  { id: 6, name: 'Fundação Instituto de Pesquisas Contábeis', logoUrl: '', active: true },
  { id: 7, name: 'Rotary Club Araraquara', logoUrl: '', active: true },
  { id: 8, name: 'Sicredi', logoUrl: '', active: false },
  { id: 9, name: 'Unimed Araraquara', logoUrl: '', active: true },
  { id: 10, name: 'Faber-Castell', logoUrl: '', active: true },
  { id: 11, name: 'Grupo Rezende', logoUrl: '', active: false },
  { id: 12, name: 'Instituto CCR', logoUrl: '', active: true },
];

@Injectable({ providedIn: 'root' })
export class PartnersService {
  private readonly partnersSignal = signal<Partner[]>(INITIAL_PARTNERS);
  private nextId = INITIAL_PARTNERS.length + 1;

  readonly partners = computed(() => this.partnersSignal());

  async create(input: PartnerInput): Promise<Partner> {
    await this.simulateLatency();
    const partner: Partner = { ...input, id: this.nextId++ };
    this.partnersSignal.update((list) => [partner, ...list]);
    return partner;
  }

  async update(id: number, input: PartnerInput): Promise<void> {
    await this.simulateLatency();
    this.partnersSignal.update((list) =>
      list.map((partner) => (partner.id === id ? { ...partner, ...input } : partner)),
    );
  }

  async setActive(id: number, active: boolean): Promise<void> {
    await this.simulateLatency(150);
    this.partnersSignal.update((list) =>
      list.map((partner) => (partner.id === id ? { ...partner, active } : partner)),
    );
  }

  async remove(id: number): Promise<void> {
    await this.simulateLatency();
    this.partnersSignal.update((list) => list.filter((partner) => partner.id !== id));
  }

  private simulateLatency(ms = 350): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
