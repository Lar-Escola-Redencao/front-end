import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';

@Directive({ selector: 'input[matAutocomplete][appFecharAutocompleteFora]', standalone: true })
export class FecharAutocompleteFora implements OnInit, OnDestroy {
  private readonly documento = inject(DOCUMENT);
  private readonly campo = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly autocomplete = inject(MatAutocompleteTrigger);
  private readonly zona = inject(NgZone);

  ngOnInit(): void {
    // Captura o clique antes que o modal interrompa sua propagação.
    this.zona.runOutsideAngular(() => {
      this.documento.addEventListener('click', this.fecharAoClicarFora, true);
    });
  }

  ngOnDestroy(): void {
    this.documento.removeEventListener('click', this.fecharAoClicarFora, true);
  }

  private readonly fecharAoClicarFora = (evento: MouseEvent): void => {
    if (!this.autocomplete.panelOpen) return;
    const alvo = evento.target as Node | null;
    const painel = this.autocomplete.autocomplete.panel?.nativeElement;
    if (!alvo || this.campo.nativeElement.contains(alvo) || painel?.contains(alvo)) return;
    this.zona.run(() => this.autocomplete.closePanel());
  };
}
