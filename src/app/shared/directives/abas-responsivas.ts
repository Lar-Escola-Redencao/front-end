import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

@Directive({ selector: '[appAbasResponsivas]' })
export class AbasResponsivas implements AfterViewInit, OnDestroy {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zona = inject(NgZone);
  private redimensionamento?: ResizeObserver;
  private alteracoes?: MutationObserver;
  private destruida = false;

  ngAfterViewInit(): void {
    this.zona.runOutsideAngular(() => {
      const container = this.elemento.nativeElement;
      this.atualizar();
      if (typeof ResizeObserver !== 'undefined') {
        this.redimensionamento = new ResizeObserver(this.atualizar);
        this.redimensionamento.observe(container);
      }
      if (typeof MutationObserver !== 'undefined') {
        this.alteracoes = new MutationObserver(this.atualizar);
        this.alteracoes.observe(container, { childList: true, subtree: true, characterData: true });
      }
      void container.ownerDocument.fonts?.ready.then(this.atualizar);
    });
  }

  ngOnDestroy(): void {
    this.destruida = true;
    this.redimensionamento?.disconnect();
    this.alteracoes?.disconnect();
  }

  private readonly atualizar = (): void => {
    if (this.destruida) return;
    const container = this.elemento.nativeElement;
    const botoes = Array.from(container.children).filter(elemento => elemento.matches('.aba-btn'));
    const topos = botoes.map(botao => botao.getBoundingClientRect().top);
    const primeiraQuebra = topos.findIndex(topo => Math.abs(topo - topos[0]) > 1);
    const quebrou = primeiraQuebra !== -1;
    container.classList.toggle('abas-quebradas', quebrou);

    const fimPrimeiraLinha = quebrou ? primeiraQuebra - 1 : botoes.length - 1;
    const inicioUltimaLinha = topos.findIndex(topo => Math.abs(topo - topos[topos.length - 1]) <= 1);
    botoes.forEach((botao, indice) => {
      botao.classList.toggle('aba-superior-esquerda', indice === 0);
      botao.classList.toggle('aba-superior-direita', indice === fimPrimeiraLinha);
      botao.classList.toggle('aba-inferior-esquerda', indice === inicioUltimaLinha);
      botao.classList.toggle('aba-inferior-direita', indice === botoes.length - 1);
    });
  };
}
