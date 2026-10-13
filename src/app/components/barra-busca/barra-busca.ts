import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, filter, map } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** Tempo sem digitação antes de disparar a busca, para não sobrecarregar a API. */
export const DEBOUNCE_BUSCA_MS = 500;

/**
 * Barra de busca única (Omnisearch) posicionada acima das tabelas de listagem.
 * Emite o termo (já sem espaços nas pontas) 500ms após o usuário parar de digitar;
 * quem consome repassa o valor como ?search= na requisição GET.
 */
@Component({
  selector: 'app-barra-busca',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './barra-busca.html',
  styleUrl: './barra-busca.css'
})
export class BarraBusca implements OnInit, OnDestroy {

  @Input() placeholder = 'Buscar...';

  /** Termo atual (ex.: vindo da URL). Atualiza o campo sem disparar nova busca. */
  @Input() set valor(termo: string | null | undefined) {
    const normalizado = termo ?? '';
    if (normalizado !== this.controle.value.trim()) {
      this.controle.setValue(normalizado, { emitEvent: false });
    }
    this.ultimoTermo = normalizado;
  }

  @Output() buscar = new EventEmitter<string>();

  readonly controle = new FormControl('', { nonNullable: true });

  private ultimoTermo = '';
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.controle.valueChanges
      .pipe(
        debounceTime(DEBOUNCE_BUSCA_MS),
        map(valor => valor.trim()),
        // Compara com o último termo conhecido (inclusive o vindo da URL), não só com a última emissão.
        filter(termo => termo !== this.ultimoTermo)
      )
      .subscribe(termo => {
        this.ultimoTermo = termo;
        this.buscar.emit(termo);
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  limpar(): void {
    this.controle.setValue('');
  }
}
