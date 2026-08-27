import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-layout',
  standalone: true,
  imports: [],
  templateUrl: './modal-layout.html',
  styleUrl: './modal-layout.css',
})
export class ModalLayout {
  @Input() titulo = '';
  @Output() closed = new EventEmitter<void>();
}
