import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicDiretoriaComponent } from './public-diretoria/public-diretoria';
import { PublicUnidadesComponent } from '../home/public-unidades/public-unidades';
import {
  SobrePublicoService,
  ConteudoSobre,
  IndicadoresSobre,
} from 'src/app/shared/services/sobre/sobre-publico.service';

@Component({
  selector: 'app-sobre',
  imports: [PublicNavbar, PublicFooter, PublicDiretoriaComponent, PublicUnidadesComponent],
  templateUrl: './sobre.html',
  styleUrl: './sobre.css',
})
export class Sobre {
  private readonly sobrePublicoService = inject(SobrePublicoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly botoesAnos = viewChildren<ElementRef<HTMLButtonElement>>('ano');
  protected readonly carregando = signal(false);
  protected readonly erro = signal(false);
  protected readonly conteudo = signal<ConteudoSobre>({ texto: [], historia: [], carrossel: [] });
  protected readonly indiceHistoria = signal(0);
  protected readonly historiaSelecionada = computed(
    () => this.conteudo().historia[this.indiceHistoria()] ?? null,
  );
  protected readonly totalUnidades = signal<number | null>(null);
  protected readonly indicadores = signal<IndicadoresSobre | null>(null);
  protected readonly meninosAtendidos = computed(() => {
    const total = this.indicadores()?.totalMeninos;
    return total == null ? '—' : `${total}`;
  });
  protected readonly anosOsc = computed(() => {
    const fundacao = this.indicadores()?.dataFundacao;
    if (!fundacao) return null;
    const [ano, mes, dia] = fundacao.split('-').map(Number);
    const hoje = new Date();
    const aniversarioPendente =
      hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
    return hoje.getFullYear() - ano - (aniversarioPendente ? 1 : 0);
  });
  protected readonly imagensComErro = signal<string[]>([]);
  protected readonly colunasFotos = computed(() => {
    const fotos = this.conteudo().carrossel;
    return Array.from({ length: Math.ceil(fotos.length / 2) }, (_, indice) =>
      fotos.slice(indice * 2, indice * 2 + 2),
    );
  });

  constructor() {
    this.carregarConteudo();
  }

  protected carregarConteudo(): void {
    if (this.carregando()) return;
    this.carregando.set(true);
    this.erro.set(false);
    this.totalUnidades.set(null);
    this.indicadores.set(null);
    this.sobrePublicoService
      .obterIndicadores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (indicadores) => this.indicadores.set(indicadores),
        error: () => this.indicadores.set(null),
      });
    this.sobrePublicoService
      .obterTotalUnidades()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (total) => this.totalUnidades.set(total),
        error: () => this.totalUnidades.set(null),
      });
    this.sobrePublicoService
      .obterConteudo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conteudo) => {
          this.conteudo.set(conteudo);
          this.indiceHistoria.set(0);
          this.imagensComErro.set([]);
          this.carregando.set(false);
          afterNextRender(
            () => {
              const fragmento = this.route.snapshot.fragment;
              if (fragmento) document.getElementById(fragmento)?.scrollIntoView({ block: 'start' });
            },
            { injector: this.injector },
          );
        },
        error: () => {
          this.erro.set(true);
          this.carregando.set(false);
        },
      });
  }

  protected selecionarHistoria(indice: number, botao?: HTMLButtonElement): void {
    if (indice < 0 || indice >= this.conteudo().historia.length) return;
    this.indiceHistoria.set(indice);
    const selecionado = botao ?? this.botoesAnos()[indice]?.nativeElement;
    selecionado?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  protected navegarHistoria(event: KeyboardEvent, indice: number): void {
    let destino: number;
    switch (event.key) {
      case 'ArrowRight':
        destino = Math.min(indice + 1, this.conteudo().historia.length - 1);
        break;
      case 'ArrowLeft':
        destino = Math.max(indice - 1, 0);
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = this.conteudo().historia.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const botao = this.botoesAnos()[destino]?.nativeElement;
    this.selecionarHistoria(destino, botao);
    botao?.focus({ preventScroll: true });
  }

  protected imagemFalhou(url: string): void {
    this.imagensComErro.update((imagens) => (imagens.includes(url) ? imagens : [...imagens, url]));
  }
}
