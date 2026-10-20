import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-estado-vazio',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './estado-vazio.html',
  styleUrl: './estado-vazio.css'
})
export class EstadoVazio {
  @Input() mensagem = 'Nenhum registro cadastrado.';
  @Input() icone = 'inbox';
  @Input() compacto = false;
}
