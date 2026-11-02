import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BloquearScroll } from '../../shared/directives/bloquear-scroll';

@Component({
  selector: 'app-modal-layout',
  standalone: true,
  imports: [BloquearScroll, MatIconModule],
  templateUrl: './modal-layout.html',
  styleUrl: './modal-layout.css',
})
export class ModalLayout {
  @Input() titulo = '';
  @Input() fecharAoClicarFora = true;
  @Output() backdropClick = new EventEmitter<void>();

  clicarFora(): void {
    this.backdropClick.emit();
    if (this.fecharAoClicarFora) this.closed.emit();
  }
  @Output() closed = new EventEmitter<void>();
}
