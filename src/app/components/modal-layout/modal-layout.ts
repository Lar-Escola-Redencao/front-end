import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BloquearScroll } from '../../shared/directives/bloquear-scroll';

@Component({
  selector: 'app-modal-layout',
  standalone: true,
  imports: [BloquearScroll],
  templateUrl: './modal-layout.html',
  styleUrl: './modal-layout.css',
})
export class ModalLayout {
  @Input() titulo = '';
  @Output() closed = new EventEmitter<void>();
}
