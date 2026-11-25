import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';

import { FotoUsuarioService } from '../../services/usuario/foto-usuario.service';

/**
 * Exibe a foto de um usuário carregada pela rota protegida da API.
 *
 * Enquanto carrega, quando não há foto cadastrada ou quando a imagem falha, mostra o conteúdo
 * projetado (a imagem padrão de cada tela). A URL temporária é liberada ao trocar de foto e ao
 * destruir o componente. O host usa `display: contents` para não alterar o layout existente.
 *
 * ```html
 * <app-foto-usuario [caminho]="usuario.imagemPerfil" classeImagem="avatar" alt="Foto">
 *   <div class="avatar placeholder"><mat-icon>person</mat-icon></div>
 * </app-foto-usuario>
 * ```
 */
@Component({
  selector: 'app-foto-usuario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @if (url(); as src) {
      <img [src]="src" [alt]="alt()" [class]="classeImagem()" (error)="aoFalhar()" />
    } @else {
      <ng-content />
    }
  `,
})
export class FotoUsuario {
  private readonly fotos = inject(FotoUsuarioService);

  /** Valor de `imagemPerfil` da API (rota protegida) ou uma prévia local (`data:`/`blob:`). */
  readonly caminho = input<string | null | undefined>(null);
  readonly alt = input('Foto de perfil');
  readonly classeImagem = input('');

  protected readonly url = signal<string | null>(null);
  /** URL criada por este componente (a única que ele pode liberar). */
  private urlCriada: string | null = null;

  constructor() {
    effect(onCleanup => {
      const caminho = this.caminho();
      this.url.set(null);
      const assinatura = this.fotos.carregar(caminho).subscribe(url => {
        if (url && url !== caminho) this.urlCriada = url;
        this.url.set(url);
      });
      onCleanup(() => {
        assinatura.unsubscribe();
        this.liberar();
      });
    });
    inject(DestroyRef).onDestroy(() => this.liberar());
  }

  protected aoFalhar(): void {
    this.liberar();
    this.url.set(null);
  }

  private liberar(): void {
    this.fotos.liberar(this.urlCriada);
    this.urlCriada = null;
  }
}
