import { signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';

/** Estado independente por tabela; consultas substituídas são canceladas. */
export class ListaPaginada<T> {
  readonly dados = signal<T[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal(false);
  readonly pagina = signal(0);
  readonly tamanho = signal(5);
  readonly total = signal(0);
  readonly paginas = signal(0);
  readonly busca = signal('');
  private consulta?: Subscription;

  constructor(private readonly consultar: (pagina: number, tamanho: number, busca: string) => Observable<PaginaResposta<T>>) {}

  carregar(): void {
    this.consulta?.unsubscribe();
    this.carregando.set(true);
    this.erro.set(false);
    this.consulta = this.consultar(this.pagina(), this.tamanho(), this.busca()).subscribe({
      next: resposta => {
        if (resposta.content.length === 0 && this.pagina() > 0) {
          this.pagina.set(Math.max(0, resposta.page.totalPages - 1));
          this.carregar();
          return;
        }
        this.dados.set(resposta.content);
        this.total.set(resposta.page.totalElements);
        this.paginas.set(resposta.page.totalPages);
        this.carregando.set(false);
      },
      error: () => { this.erro.set(true); this.carregando.set(false); },
    });
  }

  pesquisar(busca: string): void { this.busca.set(busca); this.pagina.set(0); this.carregar(); }
  mudarPagina(pagina: number): void { this.pagina.set(pagina); this.carregar(); }
  mudarTamanho(tamanho: number): void { this.tamanho.set(tamanho); this.pagina.set(0); this.carregar(); }
  reiniciar(): void { this.pagina.set(0); this.busca.set(''); this.dados.set([]); this.carregar(); }
  destruir(): void { this.consulta?.unsubscribe(); }
}
