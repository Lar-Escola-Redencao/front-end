import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-toggle-switch',
  templateUrl: './toggle-switch.html',
  styleUrl: './toggle-switch.css',
})
export class ToggleSwitch {
  readonly checked = model.required<boolean>();
  readonly disabled = input(false);
  readonly ariaLabel = input('Ativo');

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.checked.set(!this.checked());
  }
}
