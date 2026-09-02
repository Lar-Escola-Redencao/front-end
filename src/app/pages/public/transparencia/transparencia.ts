import { Component, inject, signal } from '@angular/core';

import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Secao, Documento } from 'src/app/shared/models/transparencia.model';
import { TransparenciaPublicaService } from 'src/app/shared/services/transparencia/transparencia-publica.service';

@Component({
  selector: 'app-transparencia',
  standalone: true,
  imports: [PublicNavbar],
  templateUrl: './transparencia.html',
  styleUrl: './transparencia.css',
})
export class Transparencia {
  private readonly transparenciaService = inject(TransparenciaPublicaService);

  protected readonly secoes = signal<Secao[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.transparenciaService.listarSecoes().subscribe({
      next: (secoes) => {
        this.secoes.set(secoes.filter((secao) => secao.ativo));
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'Não foi possível carregar os documentos de transparência. Tente novamente.',
        );
        this.isLoading.set(false);
      },
    });
  }

  protected urlVisualizar(documento: Documento): string {
    return this.transparenciaService.urlVisualizar(documento);
  }

  protected urlBaixar(documento: Documento): string {
    return this.transparenciaService.urlBaixar(documento);
  }
}
