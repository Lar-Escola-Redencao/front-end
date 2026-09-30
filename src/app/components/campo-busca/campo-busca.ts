import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/**
 * Barra de busca única (Omnisearch) exibida acima das tabelas de listagem.
 * Só renderiza o input: quem usa escuta control.valueChanges com debounceTime
 * e repassa o termo como ?search= para a API.
 */
@Component({
  selector: 'app-campo-busca',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './campo-busca.html',
  styleUrl: './campo-busca.css'
})
export class CampoBusca {
  @Input({ required: true }) control!: FormControl<string | null>;
  @Input() placeholder = 'Buscar';

  limpar(): void {
    this.control.setValue('');
  }
}
