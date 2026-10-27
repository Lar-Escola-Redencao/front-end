import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BloquearScroll } from 'src/app/shared/directives/bloquear-scroll';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { GraficaService } from 'src/app/shared/services/pagina/grafica.service';
import { Secao } from 'src/app/shared/services/pagina/pagina-cms.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

const GRUPO_TELEFONE = 'telefone';
const CODIGO_PAIS_BRASIL = '55';

/**
 * Normaliza o telefone para o formato do wa.me (código do país + DDD + número).
 * Número nacional (10 ou 11 dígitos) sempre recebe o 55, mesmo quando o DDD é 55;
 * só considera que o 55 já é o código do país quando há 12 ou 13 dígitos.
 */
export function normalizarTelefoneWhatsapp(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '').replace(/^0+/, '');

  if (digitos.length === 10 || digitos.length === 11) {
    return `${CODIGO_PAIS_BRASIL}${digitos}`;
  }
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith(CODIGO_PAIS_BRASIL)) {
    return digitos;
  }
  return null;
}

@Component({
  selector: 'app-grafica',
  imports: [PublicNavbar, PublicFooter, BloquearScroll],
  templateUrl: './grafica.html',
  styleUrl: './grafica.css',
})
export class Grafica implements OnDestroy {
  private readonly graficaService = inject(GraficaService);
  private readonly publicContentService = inject(PublicContentService);

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  @ViewChild('lightbox') private lightboxRef?: ElementRef<HTMLDialogElement>;

  protected readonly itensPorPagina = signal(this.quantidadeVisivel());
  protected readonly indiceAtual = signal(0);
  protected readonly comTransicao = signal(true);
  protected readonly mouseSobre = signal(false);
  protected readonly focoDentro = signal(false);
  protected readonly imagemAmpliada = signal<Secao | null>(null);
  private readonly imagensComErro = signal(new Set<number>());
  private rotacaoTimer?: ReturnType<typeof setInterval>;
  private transicaoTimer?: ReturnType<typeof setTimeout>;
  private reposicaoTimer?: ReturnType<typeof setTimeout>;
  private animando = false;
  private inicioToque?: number;
  private arrastou = false;

  protected readonly produtos = signal<Secao[]>([]);
  protected readonly contato = signal<Secao | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly navegacaoAtiva = computed(() => this.produtos().length >= 5
    || this.produtos().length > this.itensPorPagina());
  protected readonly produtosCarrossel = computed(() => {
    const produtos = this.produtos();
    if (!this.navegacaoAtiva()) return produtos;
    const copias = Math.max(3, 2 + Math.ceil(this.itensPorPagina() / produtos.length));
    return Array.from({ length: copias }, () => produtos).flat();
  });
  protected readonly transformacao = computed(() => this.navegacaoAtiva()
    ? `translateX(calc(-${this.indiceAtual() * 100 / this.itensPorPagina()}% - ${this.indiceAtual() * 16 / this.itensPorPagina()}px))`
    : 'none');

  protected readonly linkWhatsapp = computed(() => {
    const numero = normalizarTelefoneWhatsapp(this.contato()?.titulo);
    if (!numero) return null;

    const mensagem = encodeURIComponent(
      'Olá! Encontrei o contato de vocês pelo site e gostaria de solicitar um orçamento de serviços gráficos.',
    );
    return `https://wa.me/${numero}?text=${mensagem}`;
  });

  protected readonly contatoAlternativo = computed(() => {
    const conteudo = this.contato()?.conteudo?.trim();
    if (!conteudo) return null;

    const email = conteudo.includes('@');
    return {
      rotulo: email ? 'ou entre em contato através do e-mail' : 'ou entre em contato através do telefone',
      valor: conteudo,
      href: email ? `mailto:${conteudo}` : `tel:${conteudo.replace(/[^\d+]/g, '')}`
    };
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.pararRotacao();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.graficaService.listarSecoes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (secoes) => {
        // A API retorna [] quando não há registros; qualquer outro formato é tratado como vazio
        const lista: Secao[] = Array.isArray(secoes) ? secoes : [];
        const secoesAtivasOrdenadas = lista
          .filter((secao) => secao?.ativo)
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

        this.contato.set(
          secoesAtivasOrdenadas.find((secao) => secao.grupo === GRUPO_TELEFONE) ?? null,
        );
        this.produtos.set(
          secoesAtivasOrdenadas.filter((secao) => secao.grupo !== GRUPO_TELEFONE),
        );
        this.isLoading.set(false);
        this.configurarCarrossel();
      },
      error: () => {
        this.errorMessage.set(
          'Não foi possível carregar as informações da gráfica. Tente novamente.',
        );
        this.isLoading.set(false);
      },
    });
  }

  protected obterUrlImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

  protected podeAmpliar(produto: Secao): boolean {
    return !!this.obterUrlImagem(produto.imagem) && !this.imagensComErro().has(produto.id);
  }

  protected onImageError(produto: Secao): void {
    this.imagensComErro.update(ids => new Set([...ids, produto.id]));
  }

  private quantidadeVisivel(): number {
    if (window.innerWidth <= 600) return 1;
    const larguraCarrossel = window.innerWidth;
    const laterais = 2 * (56 + 16 + 8 + 4); // Setas, recuos e espaços da grade.
    const espacamento = 16;
    const larguraReferencia = 220;
    return Math.max(1, Math.floor((larguraCarrossel - laterais + espacamento)
      / (larguraReferencia + espacamento)));
  }

  @HostListener('window:resize')
  protected aoRedimensionar(): void {
    const quantidade = this.quantidadeVisivel();
    if (quantidade === this.itensPorPagina()) return;
    this.itensPorPagina.set(quantidade);
    this.configurarCarrossel();
  }

  private configurarCarrossel(): void {
    clearTimeout(this.transicaoTimer);
    clearTimeout(this.reposicaoTimer);
    this.animando = false;
    this.comTransicao.set(false);
    this.indiceAtual.set(this.navegacaoAtiva() ? this.produtos().length : 0);
    this.pararRotacao();
    if (this.navegacaoAtiva() && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.rotacaoTimer = setInterval(() => {
        if (!this.mouseSobre() && !this.focoDentro() && !this.imagemAmpliada() && !document.hidden) {
          this.scrollCarrossel(1);
        }
      }, 3000);
    }
  }

  protected itemVisivel(indice: number): boolean {
    return !this.navegacaoAtiva()
      || (indice >= this.indiceAtual() && indice < this.indiceAtual() + this.itensPorPagina());
  }

  protected aoSairFoco(evento: FocusEvent): void {
    this.focoDentro.set(!!evento.relatedTarget && (evento.currentTarget as HTMLElement).contains(evento.relatedTarget as Node));
  }

  protected iniciarToque(evento: PointerEvent): void {
    this.arrastou = false;
    this.inicioToque = evento.pointerType === 'mouse' ? undefined : evento.clientX;
  }

  protected terminarToque(evento: PointerEvent): void {
    if (this.inicioToque == null) return;
    const diferenca = evento.clientX - this.inicioToque;
    this.inicioToque = undefined;
    this.arrastou = Math.abs(diferenca) > 40;
    if (this.arrastou) this.scrollCarrossel(diferenca < 0 ? 1 : -1);
  }

  protected abrirImagem(produto: Secao): void {
    if (this.arrastou) { this.arrastou = false; return; }
    if (!this.podeAmpliar(produto)) return;
    this.imagemAmpliada.set(produto);
    this.cdr.detectChanges();
    this.lightboxRef?.nativeElement.showModal();
  }

  protected fecharImagem(): void {
    this.lightboxRef?.nativeElement.close();
    this.imagemAmpliada.set(null);
  }

  protected fecharAoClicarFora(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.fecharImagem();
  }

  private pararRotacao(): void {
    clearInterval(this.rotacaoTimer);
  }

  ngOnDestroy(): void {
    this.pararRotacao();
    clearTimeout(this.transicaoTimer);
    clearTimeout(this.reposicaoTimer);
  }

  protected scrollCarrossel(direcao: number): void {
    if (!this.navegacaoAtiva() || this.animando) return;
    this.animando = true;
    this.comTransicao.set(true);
    this.indiceAtual.update(indice => indice + (direcao < 0 ? -1 : 1));
    this.transicaoTimer = setTimeout(() => {
      const quantidade = this.produtos().length;
      if (this.indiceAtual() < quantidade || this.indiceAtual() >= quantidade * 2) {
        this.comTransicao.set(false);
        this.indiceAtual.set(quantidade + (this.indiceAtual() % quantidade));
        this.reposicaoTimer = setTimeout(() => { this.animando = false; }, 30);
      } else {
        this.animando = false;
      }
    }, 500);
  }
}
