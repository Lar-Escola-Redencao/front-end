import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, Input, NgZone, OnDestroy, output, signal, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';

interface Turnstile {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
  reset(id: string): void;
}
declare global {
  interface Window { turnstile?: Turnstile; }
}

let carregamento: Promise<Turnstile> | undefined;

@Component({
  selector: 'app-captcha-pix',
  standalone: true,
  template: `
    <div class="captcha-area" [style.height.px]="65 * escala()" [attr.aria-busy]="carregando()">
      @if (carregando()) {
        <div class="captcha-carregando" role="status" aria-label="Carregando verificação de segurança">
          <span class="spinner" aria-hidden="true"></span>
        </div>
      }
      <div class="captcha-escala" [style.width]="escala() < 1 ? '300px' : '100%'"
        [style.visibility]="carregando() ? 'hidden' : null"
        [style.transform]="'scale(' + escala() + ')'">
        <div #desafio class="desafio" aria-label="Verificação de segurança"></div>
      </div>
    </div>
    @if (mensagem()) {
      <p role="status" [class.somente-leitor]="verificado()" [class.mensagem-erro]="mensagemErro()">
        {{ mensagemExibida }}
        @if (falhou()) {
          <button type="button" (click)="tentarNovamente()">Tente novamente.</button>
        }
      </p>
    }
  `,
  styles: `
    :host { display: block; width: 100%; min-width: 0; margin: 12px 0; }
    .captcha-area { position: relative; display: flex; justify-content: center; width: 100%; min-width: 0; overflow: hidden; }
    .captcha-carregando { position: absolute; inset: 0; display: grid; place-items: center; }
    .spinner { width: 28px; height: 28px; box-sizing: border-box; border: 3px solid var(--primary-color);
      border-right-color: transparent; border-radius: 50%; animation: girar .8s linear infinite; }
    @keyframes girar { to { transform: rotate(360deg); } }
    .captcha-escala { flex-shrink: 0; min-width: 300px; transform-origin: center top; }
    .desafio { width: 100%; min-height: 65px; }
    .mensagem-erro { color: var(--error-color, #c62828); }
    p { font-size: .875rem; line-height: 1.5; margin: 8px 0; }
    .somente-leitor { position: absolute; width: 1px; height: 1px; padding: 0;
      margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
    button { border: 0; padding: 0; background: transparent; color: inherit;
      font: inherit; text-decoration: underline; cursor: pointer; }
    button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
  `,
})
export class CaptchaPix implements AfterViewInit, OnDestroy {
  protected get mensagemExibida(): string {
    return this.falhou()
      ? this.mensagem().replace(/ (?:Confira sua conexão e tente novamente|Tente novamente|Faça uma nova verificação)\.$/i, '')
      : this.mensagem();
  }

  @Input({ required: true }) identificador = '';
  @Input() acao = 'agradecimento_pix';
  @ViewChild('desafio', { static: true }) private container!: ElementRef<HTMLElement>;
  readonly tokenAlterado = output<string>();
  protected readonly mensagem = signal('');
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly mensagemErro = signal(false);
  protected readonly verificado = signal(false);
  private readonly documento = inject(DOCUMENT);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly escala = signal(1);
  private observador?: ResizeObserver;
  private readonly zone = inject(NgZone);
  private widget?: string;
  private api?: Turnstile;
  private destruido = false;

  ngAfterViewInit(): void {
    queueMicrotask(() => this.ajustarEscala(this.elemento.nativeElement.clientWidth));
    if (typeof ResizeObserver !== 'undefined') {
      this.observador = new ResizeObserver(([entrada]) => {
        this.zone.run(() => this.ajustarEscala(entrada.contentRect.width));
      });
      this.observador.observe(this.elemento.nativeElement);
    }
    void this.carregar();
  }

  private ajustarEscala(largura: number): void {
    if (!this.destruido && largura > 0) this.escala.set(Math.min(1, largura / 300));
  }

  private carregarApi(): Promise<Turnstile> {
    const janela = this.documento.defaultView;
    if (janela?.turnstile) return Promise.resolve(janela.turnstile);
    if (carregamento) return carregamento;
    carregamento = new Promise<Turnstile>((resolve, reject) => {
      const script = this.documento.createElement('script');
      const falha = () => {
        clearTimeout(timeout);
        script.remove();
        carregamento = undefined;
        reject(new Error('Verificação indisponível'));
      };
      const timeout = setTimeout(falha, 15000);
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = falha;
      script.onload = () => {
        if (!janela?.turnstile) { falha(); return; }
        clearTimeout(timeout);
        resolve(janela.turnstile);
      };
      this.documento.head.appendChild(script);
    });
    return carregamento;
  }

  private async carregar(): Promise<void> {
    this.falhou.set(false);
    this.mensagemErro.set(false);
    this.verificado.set(false);
    this.carregando.set(true);
    this.mensagem.set('');
    if (!environment.turnstileSiteKey) {
      this.indisponivel('A verificação está indisponível. Tente novamente mais tarde.');
      return;
    }
    try {
      this.api = await this.carregarApi();
      if (this.destruido) return;
      this.mensagem.set('');
      this.widget = this.api.render(this.container.nativeElement, {
        sitekey: environment.turnstileSiteKey,
        action: this.acao,
        cData: this.identificador,
        language: 'pt-br',
        size: 'flexible',
        theme: 'light',
        callback: (token: string) => this.zone.run(() => {
          if (this.destruido) return;
          this.falhou.set(false);
          this.mensagemErro.set(false);
          this.verificado.set(true);
          this.mensagem.set('Verificação concluída.');
          this.tokenAlterado.emit(token);
        }),
        'expired-callback': () => this.zone.run(() => this.indisponivel('A verificação expirou. Faça uma nova verificação.')),
        'error-callback': () => this.zone.run(() => this.indisponivel('Não foi possível verificar. Tente novamente.')),
        'timeout-callback': () => this.zone.run(() => this.indisponivel('O tempo de verificação terminou. Tente novamente.')),
      });
    } catch {
      this.zone.run(() => this.indisponivel('Não foi possível carregar a verificação. Confira sua conexão e tente novamente.'));
    } finally {
      this.zone.run(() => this.carregando.set(false));
    }
  }

  private indisponivel(mensagem: string): void {
    if (this.destruido) return;
    this.carregando.set(false);
    this.tokenAlterado.emit('');
    this.verificado.set(false);
    this.mensagemErro.set(true);
    this.mensagem.set(mensagem);
    this.falhou.set(true);
  }

  resetar(): void {
    if (this.destruido) return;
    this.tokenAlterado.emit('');
    this.falhou.set(false);
    this.verificado.set(false);
    this.mensagemErro.set(true);
    this.mensagem.set('Faça uma nova verificação de segurança.');
    if (this.widget !== undefined) this.api?.reset(this.widget);
    else void this.carregar();
  }

  protected tentarNovamente(): void { this.resetar(); }

  ngOnDestroy(): void {
    this.destruido = true;
    this.observador?.disconnect();
    if (this.widget !== undefined) this.api?.remove(this.widget);
  }
}
