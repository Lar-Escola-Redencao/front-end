import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BloqueioScrollService {
  private readonly documento = inject(DOCUMENT);
  private bloqueios = 0;
  private restaurar?: () => void;

  bloquear(): () => void {
    const janela = this.documento.defaultView;
    if (!janela) return () => {};

    if (this.bloqueios === 0) {
      const corpo = this.documento.body;
      const raiz = this.documento.documentElement;
      const x = janela.scrollX;
      const y = janela.scrollY;
      const salvar = (estilo: CSSStyleDeclaration, propriedades: string[]) => {
        const valores = propriedades.map(nome => [nome, estilo.getPropertyValue(nome), estilo.getPropertyPriority(nome)]);
        return () => valores.forEach(([nome, valor, prioridade]) => {
          if (valor) estilo.setProperty(nome, valor, prioridade);
          else estilo.removeProperty(nome);
        });
      };
      const restaurarCorpo = salvar(corpo.style, ['position', 'top', 'left', 'width', 'overflow', 'padding-right']);
      const restaurarRaiz = salvar(raiz.style, ['overflow']);
      const larguraBarra = Math.max(0, janela.innerWidth - raiz.clientWidth);
      const padding = Number.parseFloat(janela.getComputedStyle(corpo).paddingRight) || 0;

      // Fixar o corpo também impede a rolagem do fundo no Safari mobile.
      corpo.style.setProperty('position', 'fixed');
      corpo.style.setProperty('top', `${-y}px`);
      corpo.style.setProperty('left', `${-x}px`);
      corpo.style.setProperty('width', '100%');
      corpo.style.setProperty('overflow', 'hidden');
      if (larguraBarra) corpo.style.setProperty('padding-right', `${padding + larguraBarra}px`);
      raiz.style.setProperty('overflow', 'hidden');

      this.restaurar = () => {
        restaurarCorpo();
        restaurarRaiz();
        janela.scrollTo({ left: x, top: y, behavior: 'instant' });
      };
    }

    this.bloqueios++;
    let liberado = false;
    return () => {
      if (liberado) return;
      liberado = true;
      if (--this.bloqueios === 0) {
        this.restaurar?.();
        this.restaurar = undefined;
      }
    };
  }
}
