import { CurrencyPipe, DatePipe, DOCUMENT, Location } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { Component, computed, DestroyRef, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { CodigoPix, ConfiguracaoPix, PixService } from 'src/app/shared/services/pix/pix.service';
import { HistoricoPixService } from 'src/app/shared/services/pix/historico-pix.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { forkJoin, timer } from 'rxjs';

@Component({
  selector: 'app-como-ajudar',
  standalone: true,
  imports: [PublicNavbar, PublicFooter, FormsModule, CurrencyPipe, DatePipe, ModalLayout, A11yModule, OverlayModule],
  templateUrl: './como-ajudar.html',
  styleUrl: './como-ajudar.css',
})
export class ComoAjudar implements OnInit {
  private readonly pixService = inject(PixService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clipboard = inject(Clipboard);
  private readonly documento = inject(DOCUMENT);
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
  protected readonly feedbackDownload = signal('');
  protected readonly duvidaAberta = signal(false);
  protected readonly confirmandoAcaoPix = signal(false);
  protected readonly pixInformados = computed(() => this.historico.codigos()
    .filter((codigo) => codigo.contribuicaoInformada === true));
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
  protected valorDigitado = '25,00';

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.copiaChaveTimer));
    const timer = setInterval(() => this.agora.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  @HostListener('document:keydown.escape')
  protected fecharModal(): void {
    if (this.confirmandoAcaoPix()) return;
    this.duvidaAberta.set(false);
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
    this.agradecimentoEnviado.set(false);
    this.emailDigitado = '';
    this.erroEmail.set('');
    this.feedbackDownload.set('');
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

  protected alterarValor(): void {
    this.codigo.set(null);
    this.erroValor.set('');
    this.erroGeracao.set('');
    this.feedbackCopia.set('');
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
    forkJoin({ codigo: this.pixService.gerarCodigo(valor), espera: timer(500) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ codigo }) => {
          this.codigo.set(codigo);
          this.configuracao.update((config) => config ? { ...config, chave: codigo.chave } : config);
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
              erro.error?.message ?? 'Não foi possível gerar o Pix. Tente novamente.',
            );
        },
      });
  }

  protected copiarCodigo(codigo: CodigoPix | null = this.codigo()): void {
    this.atualizarHorario();
    if (!codigo || this.prazoEncerrado(codigo)) return;
    this.feedbackCopia.set(
      this.clipboard.copy(codigo.copiaECola)
        ? 'Código Pix copiado.'
        : 'Não foi possível copiar. Selecione o código abaixo.',
    );
  }

  protected copiarChavePix(): void {
    const chave = this.configuracao()?.chave;
    if (!chave) return;
    clearTimeout(this.copiaChaveTimer);
    const copiou = this.clipboard.copy(chave);
    this.chaveCopiada.set(copiou);
    this.feedbackChave.set(
      copiou ? 'Chave Pix copiada!' : 'Não foi possível copiar. Selecione a chave para copiar.',
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

  protected async removerCodigo(identificador: string): Promise<void> {
    if (this.confirmandoAcaoPix()) return;
    this.confirmandoAcaoPix.set(true);
    let confirmou = false;
    try {
      confirmou = await Alertas.confirmarExclusao(
        'Esta ação apenas remove o registro da seção Seus Pix neste navegador. Se você já pagou, o pagamento não será cancelado.',
        'pix-alerta-acoes',
      );
    } finally {
      this.confirmandoAcaoPix.set(false);
    }
    if (!confirmou || this.destroyRef.destroyed) return;
    this.historico.remover(identificador);
    if (this.codigo()?.identificador === identificador) this.codigo.set(null);
  }

  protected async cancelarPix(codigo: CodigoPix): Promise<void> {
    if (this.gerando() || this.enviandoEmail() || this.confirmandoAcaoPix() || codigo.contribuicaoInformada === true) return;
    this.confirmandoAcaoPix.set(true);
    let confirmou = false;
    try {
      confirmou = await Alertas.confirmarCancelamentoPix();
    } finally {
      this.confirmandoAcaoPix.set(false);
    }
    if (!confirmou || this.destroyRef.destroyed) return;
    this.historico.cancelarPendentes(codigo.chave);
    this.codigo.set(null);
    this.fecharModal();
    this.feedbackCopia.set('');
    this.feedbackDownload.set('');
    this.erroEmail.set('');
    this.emailDigitado = '';
  }

  protected baixarQrCode(): void {
    const codigo = this.codigo();
    this.atualizarHorario();
    if (!codigo || this.prazoEncerrado(codigo)) return;
    try {
      const base64 = codigo.qrCode.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), (caractere) => caractere.charCodeAt(0));
      this.baixarArquivo(new Blob([bytes], { type: 'image/png' }), `pix-${codigo.identificador}.png`);
    } catch {
      this.feedbackDownload.set('Não foi possível baixar a imagem. Use o Pix Copia e Cola.');
    }
  }

  private baixarArquivo(blob: Blob, nome: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.documento.createElement('a');
    link.href = url;
    link.download = nome;
    link.rel = 'noopener';
    this.documento.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    this.feedbackDownload.set('');
  }

  protected informarPagamento(): void {
    const codigo = this.codigo();
    this.atualizarHorario();
    if (!codigo || this.prazoEncerrado(codigo) || this.enviandoEmail() || this.agradecimentoEnviado()) return;
    this.erroEmail.set('');
    const email = this.emailDigitado.trim();
    if (!email) {
      this.concluirAgradecimento(codigo);
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

  protected baixarResumo(codigo: CodigoPix): void {
    const texto = [
      'LAR ESCOLA REDENÇÃO — CÓDIGO PIX',
      `Valor solicitado: ${codigo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      `Recebedor: ${codigo.nomeRecebedor}`,
      `Cidade: ${codigo.cidadeRecebedor}`,
      `Chave Pix: ${codigo.chave}`,
      `Identificador: ${codigo.identificador}`,
      `Gerado em: ${new Date(codigo.geradoEm).toLocaleString('pt-BR')}`,
      '',
      'PIX COPIA E COLA',
      this.prazoEncerrado(codigo) ? 'Prazo de exibição encerrado. Gere um novo Pix no site.' : codigo.copiaECola,
      '',
      'Este registro não confirma pagamento. O comprovante é emitido pelo aplicativo do banco após a conclusão do Pix.',
    ].join('\n');
    try {
      this.baixarArquivo(new Blob(['\uFEFF', texto], { type: 'text/plain;charset=utf-8' }), `meu-pix-${codigo.identificador}.txt`);
    } catch {
      this.feedbackDownload.set('Não foi possível baixar os dados. Tente novamente no navegador.');
    }
  }
}
