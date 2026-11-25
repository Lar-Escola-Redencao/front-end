import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-erro-carregamento',
  standalone: true,
  templateUrl: './erro-carregamento.html',
  styleUrl: './erro-carregamento.css',
})
export class ErroCarregamento {
  @Output() tentarNovamente = new EventEmitter<void>();
}
