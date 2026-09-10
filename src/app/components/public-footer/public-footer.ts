import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { SocialLink } from 'src/app/shared/models/social-link.model';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

@Component({
  selector: 'app-public-footer',
  imports: [NgFor, NgIf],
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.css',
})
export class PublicFooter implements OnInit {
  private readonly publicContentService = inject(PublicContentService);
  private readonly cdr = inject(ChangeDetectorRef);

  socialLinks: SocialLink[] = [];

  readonly homeLinks = [
    { label: 'Unidades de atendimento', href: '#unidades' },
    { label: 'Eventos', href: '#eventos' },
    { label: 'Parceiros', href: '#parceiros' },
  ];

  readonly helpLinks = [
    { label: 'Doa\u00e7\u00e3o de nota fiscal', href: '#como-ajudar' },
    { label: 'Doa\u00e7\u00e3o via PIX', href: '#como-ajudar' },
  ];

  readonly oscLinks = [
    { label: 'Sobre', href: '#conheca-osc' },
    { label: 'Nossa hist\u00f3ria', href: '#nossa-historia' },
    { label: 'Lar Escola Reden\u00e7\u00e3o em n\u00fameros', href: '#numeros' },
    { label: 'Composi\u00e7\u00e3o da diretoria', href: '#diretoria' },
    { label: 'Unidades de atendimento', href: '#unidades' },
  ];

  ngOnInit(): void {
    this.publicContentService.getRedesSociaisAtivas().subscribe(socialLinks => {
      this.socialLinks = socialLinks;
      this.cdr.detectChanges();
    });
  }

  getSocialIconUrl(socialLink: SocialLink): string {
    return this.publicContentService.tratarUrlImagem(socialLink.icone);
  }

  getSocialFallback(socialLink: SocialLink): string {
    const nome = socialLink.nome.trim();
    if (!nome) return '?';
    return nome.toLowerCase() === 'linkedin' ? 'in' : nome.charAt(0).toLowerCase();
  }

  onSocialIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.nextElementSibling?.classList.remove('social-fallback-hidden');
  }
}
