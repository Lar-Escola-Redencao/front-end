import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Diretoria } from 'src/app/shared/models/diretoria.model';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

@Component({
  selector: 'app-public-diretoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-diretoria.html',
  styleUrl: './public-diretoria.css'
})
export class PublicDiretoriaComponent implements OnInit {
  private readonly publicContentService = inject(PublicContentService);
  diretores: Diretoria[] = [];
  carregando = true;

  ngOnInit(): void {
    this.publicContentService.getDiretoriaAtiva().subscribe({
      next: (dados) => {
        this.diretores = dados;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      }
    });
  }

  obterUrlImagem(caminho: string | null | undefined): string {
    const url = this.publicContentService.tratarUrlImagem(caminho);
    return url || this.getFallbackImage();
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.getFallbackImage();
  }

  private getFallbackImage(): string {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cccccc"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
  }
}