import { Injectable, computed, signal } from '@angular/core';
import { SocialLink, SocialLinkInput } from '../../../shared/models/social-link.model';

const INITIAL_SOCIAL_LINKS: SocialLink[] = [
  {
    id: 1,
    platform: 'instagram',
    label: 'Instagram',
    url: 'https://instagram.com/larescolaredencao',
    active: true,
  },
  {
    id: 2,
    platform: 'facebook',
    label: 'Facebook',
    url: 'https://facebook.com/larescolaredencao',
    active: true,
  },
  {
    id: 3,
    platform: 'whatsapp',
    label: 'WhatsApp',
    url: 'https://wa.me/5516999999999',
    active: false,
  },
  {
    id: 4,
    platform: 'youtube',
    label: 'YouTube',
    url: 'https://youtube.com/@larescolaredencao',
    active: true,
  },
];

@Injectable({ providedIn: 'root' })
export class SocialLinksService {
  private readonly socialLinksSignal = signal<SocialLink[]>(INITIAL_SOCIAL_LINKS);
  private nextId = INITIAL_SOCIAL_LINKS.length + 1;

  readonly socialLinks = computed(() => this.socialLinksSignal());

  async create(input: SocialLinkInput): Promise<SocialLink> {
    await this.simulateLatency();
    const socialLink: SocialLink = { ...input, id: this.nextId++ };
    this.socialLinksSignal.update((list) => [socialLink, ...list]);
    return socialLink;
  }

  async update(id: number, input: SocialLinkInput): Promise<void> {
    await this.simulateLatency();
    this.socialLinksSignal.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...input } : item)),
    );
  }

  async setActive(id: number, active: boolean): Promise<void> {
    await this.simulateLatency(150);
    this.socialLinksSignal.update((list) =>
      list.map((item) => (item.id === id ? { ...item, active } : item)),
    );
  }

  async remove(id: number): Promise<void> {
    await this.simulateLatency();
    this.socialLinksSignal.update((list) => list.filter((item) => item.id !== id));
  }

  private simulateLatency(ms = 350): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
