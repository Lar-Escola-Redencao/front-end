import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { GraficaService } from 'src/app/shared/services/pagina/grafica.service';
import { Secao } from 'src/app/shared/services/pagina/pagina-cms.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

const GRUPO_TELEFONE = 'telefone';

@Component({
  selector: 'app-grafica',
  imports: [PublicNavbar, PublicFooter],
  templateUrl: './grafica.html',
  styleUrl: './grafica.css',
})
export class Grafica {
  private readonly graficaService = inject(GraficaService);
  private readonly publicContentService = inject(PublicContentService);

  @ViewChild('track') private trackRef?: ElementRef<HTMLDivElement>;

  protected readonly produtos = signal<Secao[]>([]);
  protected readonly contato = signal<Secao | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly linkWhatsapp = computed(() => {
    const telefone = this.contato()?.titulo?.trim();
    if (!telefone) return null;

    const digitos = telefone.replace(/\D/g, '');
    if (!digitos) return null;

    const numero = digitos.startsWith('55') ? digitos : `55${digitos}`;
    const mensagem = encodeURIComponent(
      'Olá! Gostaria de solicitar um orçamento de serviços gráficos.',
    );
    return `https://wa.me/${numero}?text=${mensagem}`;
  });

  protected readonly contatoAlternativo = computed(() => {
    const conteudo = this.contato()?.conteudo?.trim();
    if (!conteudo) return null;

    return conteudo.includes('@')
      ? `ou entre em contato através do e-mail ${conteudo}`
      : `ou entre em contato através do telefone ${conteudo}`;
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.graficaService.listarSecoes().subscribe({
      next: (secoes) => {
        const secoesAtivasOrdenadas = secoes
          .filter((secao) => secao.ativo)
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

        this.contato.set(
          secoesAtivasOrdenadas.find((secao) => secao.grupo === GRUPO_TELEFONE) ?? null,
        );
        this.produtos.set(
          secoesAtivasOrdenadas.filter((secao) => secao.grupo !== GRUPO_TELEFONE),
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'Não foi possível carregar as informações da gráfica. Tente novamente.',
        );
        this.isLoading.set(false);
      },
    });
  }

  protected obterUrlImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

  protected onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.nextElementSibling?.classList.remove('imagem-fallback-hidden');
  }

  protected scrollCarrossel(direcao: number): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;

    track.scrollBy({ left: direcao * track.clientWidth * 0.8, behavior: 'smooth' });
  }
}
