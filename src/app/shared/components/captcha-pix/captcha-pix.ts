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
    <div #desafio class="desafio" [class.compacto]="compacto()" aria-label="Verificação de segurança"></div>
    @if (mensagem()) {
      <p role="status" [class.somente-leitor]="verificado()">{{ mensagem() }}</p>
    }
    @if (falhou()) {
      <button type="button" (click)="tentarNovamente()">Tentar verificação novamente</button>
    }
  `,
  styles: `
    :host { display: block; width: 100%; min-width: 0; margin: 12px 0; }
    .desafio { width: 100%; min-height: 65px; }
    .desafio.compacto { display: flex; justify-content: center; }
    p { font-size: .875rem; line-height: 1.5; margin: 8px 0; }
    .somente-leitor { position: absolute; width: 1px; height: 1px; padding: 0;
      margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
    button { border: 1px solid currentColor; border-radius: 6px; padding: 8px 12px;
      background: transparent; color: #2348b5; cursor: pointer; }
    button:focus-visible { outline: 3px solid #2348b5; outline-offset: 3px; }
  `,
})
export class CaptchaPix implements AfterViewInit, OnDestroy {
  @Input({ required: true }) identificador = '';
  @Input() acao = 'agradecimento_pix';
  @ViewChild('desafio', { static: true }) private container!: ElementRef<HTMLElement>;
  readonly tokenAlterado = output<string>();
  protected readonly mensagem = signal('Carregando verificação de segurança...');
  protected readonly falhou = signal(false);
  protected readonly compacto = signal(false);
  protected readonly verificado = signal(false);
  private readonly documento = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private widget?: string;
  private api?: Turnstile;
  private destruido = false;
  private observador?: ResizeObserver;

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.observador = new ResizeObserver(() => {
        const compacto = this.container.nativeElement.clientWidth < 300;
        if (this.destruido || this.widget === undefined || compacto === this.compacto()) return;
        this.api?.remove(this.widget);
        this.widget = undefined;
        this.tokenAlterado.emit('');
        void this.carregar();
      });
      this.observador.observe(this.container.nativeElement);
    }
    void this.carregar();
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
    this.verificado.set(false);
    this.mensagem.set('Carregando verificação de segurança...');
    if (!environment.turnstileSiteKey) {
      this.indisponivel('A verificação está indisponível. Tente novamente mais tarde.');
      return;
    }
    try {
      this.api = await this.carregarApi();
      if (this.destruido) return;
      this.compacto.set(this.container.nativeElement.clientWidth < 300);
      this.mensagem.set('');
      this.widget = this.api.render(this.container.nativeElement, {
        sitekey: environment.turnstileSiteKey,
        action: this.acao,
        cData: this.identificador,
        language: 'pt-br',
        size: this.compacto() ? 'compact' : 'flexible',
        theme: 'light',
        callback: (token: string) => this.zone.run(() => {
          if (this.destruido) return;
          this.falhou.set(false);
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
    }
  }

  private indisponivel(mensagem: string): void {
    if (this.destruido) return;
    this.tokenAlterado.emit('');
    this.verificado.set(false);
    this.mensagem.set(mensagem);
    this.falhou.set(true);
  }

  resetar(): void {
    if (this.destruido) return;
    this.tokenAlterado.emit('');
    this.falhou.set(false);
    this.verificado.set(false);
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
