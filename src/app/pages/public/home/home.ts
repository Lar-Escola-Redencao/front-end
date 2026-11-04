import { Component, ElementRef, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicParceirosComponent } from './public-parceiros/public-parceiros';
import { PublicEventosComponent } from './public-eventos/public-eventos';
import { PublicUnidadesComponent } from './public-unidades/public-unidades';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PublicNavbar, PublicFooter, PublicEventosComponent, PublicParceirosComponent, PublicUnidadesComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private eventosRestaurados = false;
  private readonly secoesCarregadas = new Set<'unidades' | 'eventos'>();
  private frameScroll: number | null = null;

  aoCarregarSecao(secao: 'unidades' | 'eventos'): void {
    this.secoesCarregadas.add(secao);
    if (this.eventosRestaurados || this.frameScroll !== null || this.route.snapshot.fragment !== 'eventos') return;
    if (this.secoesCarregadas.size < 2) return;
    // Aguarda a próxima pintura, com a altura das duas seções já definida.
    this.frameScroll = requestAnimationFrame(() => {
      this.frameScroll = null;
      const secao = this.element.nativeElement.querySelector<HTMLElement>('#eventos');
      if (!secao) return;
      secao.scrollIntoView({ block: 'start' });
      this.eventosRestaurados = true;
    });
  }

  ngOnDestroy(): void {
    if (this.frameScroll !== null) cancelAnimationFrame(this.frameScroll);
  }
}
