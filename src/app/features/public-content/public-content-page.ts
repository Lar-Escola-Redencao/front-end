import { Component, signal } from '@angular/core';
import { PartnersManager } from './partners/partners-manager';
import { SocialLinksManager } from './social-links/social-links-manager';

type PublicContentSection = 'partners' | 'social-links';

@Component({
  selector: 'app-public-content-page',
  imports: [PartnersManager, SocialLinksManager],
  templateUrl: './public-content-page.html',
  styleUrl: './public-content-page.css',
})
export class PublicContentPage {
  protected readonly section = signal<PublicContentSection | ''>('');

  onSectionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PublicContentSection | '';
    this.section.set(value);
  }
}
