import { Component, HostListener, input, output } from '@angular/core';
import { BloquearScroll } from '../../directives/bloquear-scroll';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [BloquearScroll],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
