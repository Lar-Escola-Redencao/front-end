import { Component, inject, signal } from '@angular/core';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Secao, SobreService } from 'src/app/pages/private/content-management/components/sobre/sobre.service';
import { PublicDiretoriaComponent } from './public-diretoria/public-diretoria';

@Component({
  selector: 'app-about',
  imports: [PublicNavbar, PublicFooter, PublicDiretoriaComponent],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  private readonly sobreService = inject(SobreService);

  protected readonly secoesTextoSobre = signal<Secao[]>([]);
  protected readonly secoesHistoria = signal<Secao[]>([]);
  protected readonly secoesCarrossel = signal<Secao[]>([]);

  constructor() {
    this.carregarSecoes();
  }

  private carregarSecoes(): void {
    this.sobreService.listarSecoes().subscribe((secoes) => {
      const secoesAtivasOrdenadas = secoes
        .filter((secao) => secao.ativo)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

      this.secoesTextoSobre.set(
        secoesAtivasOrdenadas.filter((secao) => secao.grupo === 'texto-sobre'),
      );
      this.secoesHistoria.set(
        secoesAtivasOrdenadas.filter((secao) => secao.grupo === 'historia'),
      );
      this.secoesCarrossel.set(
        secoesAtivasOrdenadas.filter((secao) => secao.grupo === 'carrossel'),
      );
    });
  }
}
