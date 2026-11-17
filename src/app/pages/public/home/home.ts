import { ErroCarregamento } from '@components/erro-carregamento/erro-carregamento';
import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicParceirosComponent } from './public-parceiros/public-parceiros';
import { PublicEventosComponent } from './public-eventos/public-eventos';
import { PublicUnidadesComponent } from './public-unidades/public-unidades';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ErroCarregamento, PublicNavbar, PublicFooter, PublicEventosComponent, PublicParceirosComponent, PublicUnidadesComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  @ViewChild(PublicUnidadesComponent) private unidades?: PublicUnidadesComponent;
  @ViewChild(PublicEventosComponent) private eventos?: PublicEventosComponent;
  @ViewChild(PublicParceirosComponent) private parceiros?: PublicParceirosComponent;
  private fragmentoRestaurado = false;
  private readonly secoesCarregadas = new Set<'unidades' | 'eventos' | 'parceiros'>();
  private frameScroll: number | null = null;

  carregar(): void {
    if (this.carregando()) return;
    this.carregando.set(true);
    this.erro.set(false);
    this.secoesCarregadas.clear();
    this.fragmentoRestaurado = false;
    this.unidades?.carregar();
    this.eventos?.carregar();
    this.parceiros?.carregar();
  }

  aoCarregarSecao(secao: 'unidades' | 'eventos' | 'parceiros', sucesso = true): void {
    if (!sucesso) this.erro.set(true);
    this.secoesCarregadas.add(secao);
    if (this.secoesCarregadas.size < 3) return;
    this.carregando.set(false);
    if (this.erro()) return;
    const fragmento = this.route.snapshot.fragment;
    if (this.fragmentoRestaurado || this.frameScroll !== null || !fragmento ||
        !['inicio', 'unidades', 'eventos', 'parceiros'].includes(fragmento)) return;
    // Aguarda a próxima pintura, com todas as seções visíveis.
    this.frameScroll = requestAnimationFrame(() => {
      this.frameScroll = null;
      const secao = this.element.nativeElement.querySelector<HTMLElement>(`#${fragmento}`);
      if (!secao) return;
      secao.scrollIntoView({ block: 'start' });
      this.fragmentoRestaurado = true;
    });
  }

  ngOnDestroy(): void {
    if (this.frameScroll !== null) cancelAnimationFrame(this.frameScroll);
  }
}
