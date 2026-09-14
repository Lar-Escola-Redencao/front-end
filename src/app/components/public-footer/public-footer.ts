import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SocialLink } from 'src/app/shared/models/social-link.model';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

type FooterLink = {
  label: string;
  route: string;
  fragment?: string;
};

type HomeFooterLink = {
  label: string;
  sectionId?: string;
  route?: string;
};

@Component({
  selector: 'app-public-footer',
  imports: [NgFor, NgIf, RouterLink],
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.css',
})
export class PublicFooter implements OnInit {
  private readonly publicContentService = inject(PublicContentService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  socialLinks: SocialLink[] = [];

  readonly homeLinks: HomeFooterLink[] = [
    { label: 'Unidades de atendimento', sectionId: 'unidades' },
    { label: 'Eventos', sectionId: 'eventos' },
    { label: 'Parceiros', sectionId: 'parceiros' },
    { label: 'Transpar\u00eancia', route: '/transparencia' },
  ];

  readonly helpLinks: FooterLink[] = [
    { label: 'Doa\u00e7\u00e3o de nota fiscal', route: '/', fragment: 'como-ajudar' },
    { label: 'Doa\u00e7\u00e3o via PIX', route: '/', fragment: 'como-ajudar' },
  ];

  readonly oscLinks: FooterLink[] = [
    { label: 'Sobre', route: '/conheca-a-osc', fragment: 'sobre' },
    { label: 'Nossa hist\u00f3ria', route: '/conheca-a-osc', fragment: 'historia' },
    { label: 'Lar Escola Reden\u00e7\u00e3o em n\u00fameros', route: '/conheca-a-osc', fragment: 'numeros' },
    { label: 'Composi\u00e7\u00e3o da diretoria', route: '/conheca-a-osc', fragment: 'conheca-osc' },
    { label: 'Unidades de atendimento', route: '/conheca-a-osc', fragment: 'unidades' },
  ];

  ngOnInit(): void {
    this.publicContentService.getRedesSociaisAtivas().subscribe(socialLinks => {
      this.socialLinks = socialLinks;
      this.cdr.detectChanges();
    });
  }

  navegarParaHomeSection(sectionId: string): void {
    this.navegarParaSecao('/', sectionId);
  }

  navegarParaOscSection(sectionId: string): void {
    this.navegarParaSecao('/conheca-a-osc', sectionId);
  }

  private navegarParaSecao(rota: string, sectionId: string): void {
    const rotaAtual = this.router.url.split('?')[0].split('#')[0];

    if (rotaAtual !== rota) {
      this.router.navigate([rota]).then(() => {
        setTimeout(() => this.executarScroll(sectionId), 100);
      });
      return;
    }

    this.executarScroll(sectionId);
  }

  private executarScroll(sectionId: string): void {
    const element = document.getElementById(sectionId);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (sectionId === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
