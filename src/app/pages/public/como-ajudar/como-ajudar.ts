import { CurrencyPipe, Location } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { Component, computed, DestroyRef, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { CodigoPix, ConfiguracaoPix, PixService } from 'src/app/shared/services/pix/pix.service';
import { HistoricoPixService } from 'src/app/shared/services/pix/historico-pix.service';
import { forkJoin, timer } from 'rxjs';

@Component({
  selector: 'app-como-ajudar',
  standalone: true,
  imports: [PublicNavbar, PublicFooter, FormsModule, CurrencyPipe, ModalLayout, A11yModule, MatFormFieldModule, MatInputModule],
  templateUrl: './como-ajudar.html',
  styleUrl: './como-ajudar.css',
})
export class ComoAjudar implements OnInit {
  private readonly ilustracoes = [
    '/images/doacao-solidaria.png',
    '/images/criancas-brincando.svg',
    '/images/estudando.png',
  ];
  protected readonly ilustracao = this.ilustracoes[Math.floor(Math.random() * this.ilustracoes.length)];
  private readonly pixService = inject(PixService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clipboard = inject(Clipboard);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly location = inject(Location);
  private copiaChaveTimer?: ReturnType<typeof setTimeout>;
  protected readonly historico = inject(HistoricoPixService);
  protected readonly configuracao = signal<ConfiguracaoPix | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erroCarregamento = signal(false);
  protected readonly indisponivel = signal(false);
  protected readonly gerando = signal(false);
  protected readonly codigo = signal<CodigoPix | null>(null);
  protected readonly erroValor = signal('');
  protected readonly erroGeracao = signal('');
  protected readonly feedbackCopia = signal('');
  protected readonly chaveCopiada = signal(false);
  protected readonly feedbackChave = signal('');
  protected readonly erroImagem = signal(false);
  protected readonly modalAberto = signal(false);
  protected readonly enviandoEmail = signal(false);
  protected readonly agradecimentoEnviado = signal(false);
  protected readonly erroEmail = signal('');
  protected readonly codigoCopiado = signal<string | null>(null);
  private copiaCodigoTimer?: ReturnType<typeof setTimeout>;
  protected readonly pixEmAberto = computed(() => this.historico.codigos()
    .find((codigo) => codigo.contribuicaoInformada !== true
      && codigo.chave === this.configuracao()?.chave && !this.prazoEncerrado(codigo)) ?? null);
  private readonly agora = signal(Date.now());
  protected emailDigitado = '';
  protected readonly segundosRestantes = computed(() => {
    const codigo = this.codigo();
    return codigo ? Math.max(0, Math.ceil((this.prazoCodigo(codigo) - this.agora()) / 1000)) : 0;
  });
  protected readonly tempoRestante = computed(() => {
    const segundos = this.segundosRestantes();
    return `${Math.floor(segundos / 60).toString().padStart(2, '0')}:${(segundos % 60).toString().padStart(2, '0')}`;
  });
  protected valorDigitado = '';
  protected valorEmFoco = false;
  protected readonly etapaEmail = signal(false);
  protected readonly codigoPaginaExpandido = signal(false);
  protected readonly codigoModalExpandido = signal(false);
  protected readonly orientacaoCodigoPix = 'Você pode escolher outro valor e gerar um novo código quando quiser. O pagamento só acontece quando você confirma no aplicativo do banco.';

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.copiaChaveTimer);
      clearTimeout(this.copiaCodigoTimer);
    });
    const timer = setInterval(() => this.agora.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  @HostListener('document:keydown.escape')
  protected fecharModal(): void {
    if (this.enviandoEmail()) return;
    this.modalAberto.set(false);
  }

  @HostListener('window:focus')
  protected atualizarHorario(): void {
    this.agora.set(Date.now());
  }

  private prazoCodigo(codigo: CodigoPix): number {
    const limite = Date.parse(codigo.geradoEm) + 15 * 60_000;
    return codigo.expiraEm ? Math.min(Date.parse(codigo.expiraEm), limite) : limite;
  }

  protected prazoEncerrado(codigo: CodigoPix): boolean {
    return this.prazoCodigo(codigo) <= this.agora();
  }

  protected tempoRestanteDoCodigo(codigo: CodigoPix): string {
    const segundos = Math.max(0, Math.ceil((this.prazoCodigo(codigo) - this.agora()) / 1000));
    return `${Math.floor(segundos / 60).toString().padStart(2, '0')}:${(segundos % 60).toString().padStart(2, '0')}`;
  }

  private prepararModal(): void {
    this.agora.set(Date.now());
    this.modalAberto.set(true);
    this.etapaEmail.set(false);
    this.agradecimentoEnviado.set(false);
    this.emailDigitado = '';
    this.erroEmail.set('');
  }

  ngOnInit(): void {
    this.carregarPix();
  }

  protected carregarPix(): void {
    clearTimeout(this.copiaChaveTimer);
    this.chaveCopiada.set(false);
    this.feedbackChave.set('');
    this.carregando.set(true);
    this.erroCarregamento.set(false);
    this.indisponivel.set(false);
    this.configuracao.set(null);
    this.codigo.set(null);
    this.pixService
      .obterConfiguracao()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configuracao) => {
          this.configuracao.set(configuracao);
          this.carregando.set(false);
        },
        error: (erro) => {
          this.indisponivel.set(erro.status === 404);
          this.erroCarregamento.set(erro.status !== 404);
          this.carregando.set(false);
        },
      });
  }

  protected escolherValor(valor: number): void {
    this.valorDigitado = valor.toFixed(2).replace('.', ',');
    this.alterarValor();
  }

  protected digitarValor(valor: string, campo: HTMLInputElement): void {
    if (!/^\d{0,6}(?:[.,]\d{0,2})?$/.test(valor)) {
      campo.value = this.valorDigitado;
      return;
    }
    this.valorDigitado = valor;
    this.alterarValor();
  }

  protected alterarValor(): void {
    this.codigo.set(null);
    this.erroValor.set('');
    this.erroGeracao.set('');
    this.feedbackCopia.set('');
    this.codigoCopiado.set(null);
    clearTimeout(this.copiaCodigoTimer);
  }

  protected valorSelecionado(valor: number): boolean {
    return this.lerValor() === valor;
  }

  private lerValor(): number | null {
    const texto = this.valorDigitado.trim();
    if (!/^\d{1,6}(?:[.,]\d{1,2})?$/.test(texto)) return null;
    const valor = Number(texto.replace(',', '.'));
    return valor >= 0.01 && valor <= 999999.99 ? valor : null;
  }

  protected gerarPix(): void {
    if (this.gerando() || this.enviandoEmail() || !this.configuracao()) return;
    const valor = this.lerValor();
    if (valor === null) {
      this.erroValor.set(
        'Informe um valor entre R$ 0,01 e R$ 999.999,99, com até duas casas decimais.',
      );
      return;
    }
    this.gerando.set(true);
    this.codigo.set(null);
    this.erroValor.set('');
    this.erroGeracao.set('');
    this.feedbackCopia.set('');
    this.codigoCopiado.set(null);
    clearTimeout(this.copiaCodigoTimer);
    forkJoin({ codigo: this.pixService.gerarCodigo(valor), espera: timer(500) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ codigo }) => {
          this.codigo.set(codigo);
          this.configuracao.update((config) => config ? { ...config, chave: codigo.chave, nomeRecebedor: codigo.nomeRecebedor } : config);
          this.erroImagem.set(false);
          this.historico.salvar(codigo);
          this.gerando.set(false);
          this.prepararModal();
        },
        error: (erro) => {
          this.gerando.set(false);
          if (erro.status === 404) {
            this.indisponivel.set(true);
            this.configuracao.set(null);
          } else
            this.erroGeracao.set(
              erro.status === 429
                ? 'Muitas tentativas de geração. Aguarde um pouco e tente novamente.'
                : 'Não foi possível gerar o QR Code. Tente novamente em instantes.',
            );
        },
      });
  }

  protected copiarCodigo(codigo: CodigoPix | null = this.codigo()): void {
    this.atualizarHorario();
    if (!codigo || this.prazoEncerrado(codigo) || this.codigoCopiado() === codigo.identificador) return;
    clearTimeout(this.copiaCodigoTimer);
    const copiou = this.clipboard.copy(codigo.copiaECola);
    this.codigoCopiado.set(copiou ? codigo.identificador : null);
    this.feedbackCopia.set(copiou ? '' : 'Não foi possível copiar. Selecione o código no modal.');
    if (copiou) {
      this.copiaCodigoTimer = setTimeout(() => this.codigoCopiado.set(null), 2500);
    }
  }

  protected copiarChavePix(): void {
    const chave = this.configuracao()?.chave;
    if (!chave || this.chaveCopiada()) return;
    clearTimeout(this.copiaChaveTimer);
    const copiou = this.clipboard.copy(chave);
    this.chaveCopiada.set(copiou);
    this.feedbackChave.set(
      copiou ? '' : 'Não foi possível copiar. Selecione a chave para copiar.',
    );
    if (copiou) {
      this.copiaChaveTimer = setTimeout(() => {
        this.chaveCopiada.set(false);
        this.feedbackChave.set('');
      }, 2500);
    }
  }

  protected irParaPix(evento: MouseEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
    const secao = this.elemento.nativeElement.querySelector<HTMLElement>('#pix');
    const janela = secao?.ownerDocument.defaultView;
    if (!secao || !janela) return;

    // Atualiza o fragmento sem substituir a posição calculada pela navegação nativa.
    evento.preventDefault();
    this.location.go('/como-ajudar#pix', '', this.location.getState());
    const navbar = this.elemento.nativeElement.querySelector<HTMLElement>('app-public-navbar .navbar');
    const alturaNav = navbar?.getBoundingClientRect().bottom ?? 82;
    const topo = secao.getBoundingClientRect().top + janela.scrollY - alturaNav - 8;
    janela.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' });
  }

  protected reabrirCodigo(codigo: CodigoPix): void {
    if (codigo.chave !== this.configuracao()?.chave || this.gerando() || this.enviandoEmail()) return;
    this.valorDigitado = codigo.valor.toFixed(2).replace('.', ',');
    this.alterarValor();
    this.erroImagem.set(false);
    this.codigo.set(codigo);
    this.prepararModal();
    this.agradecimentoEnviado.set(codigo.contribuicaoInformada === true);
  }

  protected abrirEmail(codigo: CodigoPix | null = this.codigo()): void {
    if (!codigo || this.enviandoEmail() || this.prazoEncerrado(codigo)) return;
    if (!this.modalAberto()) this.reabrirCodigo(codigo);
    this.etapaEmail.set(true);
  }

  protected continuarSemEmail(): void {
    if (this.enviandoEmail()) return;
    const codigo = this.codigo();
    if (codigo) this.concluirAgradecimento(codigo);
  }

  protected informarPagamento(): void {
    const codigo = this.codigo();
    this.atualizarHorario();
    if (!codigo || this.prazoEncerrado(codigo) || this.enviandoEmail() || this.agradecimentoEnviado()) return;
    this.erroEmail.set('');
    const email = this.emailDigitado.trim();
    if (!email) {
      this.erroEmail.set('Informe um e-mail ou escolha continuar sem e-mail.');
      return;
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.erroEmail.set('Informe um e-mail válido ou deixe o campo vazio.');
      return;
    }
    this.enviandoEmail.set(true);
    this.pixService.enviarAgradecimento(codigo.identificador, email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviandoEmail.set(false);
          this.concluirAgradecimento(codigo);
        },
        error: (erro) => {
          this.enviandoEmail.set(false);
          this.erroEmail.set(erro.error?.message ?? 'Não foi possível enviar o agradecimento. Tente novamente.');
        },
      });
  }

  private concluirAgradecimento(codigo: CodigoPix): void {
    this.agradecimentoEnviado.set(true);
    this.historico.informarContribuicao(codigo.identificador);
    this.codigo.set({ ...codigo, contribuicaoInformada: true });
    this.emailDigitado = '';
  }

}
