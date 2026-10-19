import { Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { BloqueioScrollService } from '../services/bloqueio-scroll.service';

@Directive({ selector: '[appBloquearScroll]', standalone: true })
export class BloquearScroll implements OnInit, OnDestroy {
  private readonly bloqueio = inject(BloqueioScrollService);
  private liberar?: () => void;

  ngOnInit(): void {
    this.liberar = this.bloqueio.bloquear();
  }

  ngOnDestroy(): void {
    this.liberar?.();
  }
}
