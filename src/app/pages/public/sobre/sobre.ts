import { ErroCarregamento } from '@components/erro-carregamento/erro-carregamento';
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
  ViewChild,
} from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { textoParaExibicao } from 'src/app/shared/utils/texto-paragrafos';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { EstadoVazio } from '@components/estado-vazio/estado-vazio';
import { PublicDiretoriaComponent } from './public-diretoria/public-diretoria';
import { PublicUnidadesComponent } from '../home/public-unidades/public-unidades';
import {
  SobrePublicoService,
  ConteudoSobre,
  IndicadoresSobre,
} from 'src/app/shared/services/sobre/sobre-publico.service';

@Component({
  selector: 'app-sobre',
  imports: [ErroCarregamento, PublicNavbar, PublicFooter, PublicDiretoriaComponent, PublicUnidadesComponent, EstadoVazio],
  templateUrl: './sobre.html',
  styleUrl: './sobre.css',
  host: { '(window:resize)': 'atualizarLargura()' },
})
export class Sobre {
  protected readonly textoParaExibicao = textoParaExibicao;
  private readonly sobrePublicoService = inject(SobrePublicoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly botoesAnos = viewChildren<ElementRef<HTMLButtonElement>>('ano');
  private readonly larguraTela = signal(window.innerWidth);
  protected readonly carregando = signal(false);
  protected readonly erro = signal(false);
  private readonly carregandoSecoes = signal(true);
  private readonly secoesCarregadas = new Set<'diretoria' | 'unidades'>();
  protected readonly carregandoPagina = computed(
    () => this.carregando() || this.carregandoSecoes(),
  );
  @ViewChild(PublicDiretoriaComponent) private diretoria?: PublicDiretoriaComponent;
  @ViewChild(PublicUnidadesComponent) private unidades?: PublicUnidadesComponent;
  protected readonly conteudo = signal<ConteudoSobre>({ texto: [], historia: [], carrossel: [] });
  protected readonly indiceHistoria = signal(0);
  protected readonly historiaSelecionada = computed(
    () => this.conteudo().historia[this.indiceHistoria()] ?? null,
  );
  protected readonly totalUnidades = signal<number | null>(null);
  protected readonly indicadores = signal<IndicadoresSobre | null>(null);
  protected readonly meninosAtendidos = computed(() => {
    const total = this.indicadores()?.totalMeninos;
    return total == null ? '—' : `+${total}`;
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
  protected readonly desenvolvedores: { id: number; nome: string; imagem: string | null }[] =
    [
      { id: 1, nome: 'Ana Beatriz Rocha Duarte', imagem: '/images/desenvolvedores/ana.jpeg' },
      { id: 2, nome: 'Eduardo Ferreira Bonifacio', imagem: '/images/desenvolvedores/eduardo.jpeg' },
      { id: 3, nome: 'Gabriel Albino', imagem: '/images/desenvolvedores/gabriel.jpeg' },
      { id: 4, nome: 'Gabrielle Ulisses', imagem: '/images/desenvolvedores/gabrielle.jpeg' },
      { id: 5, nome: 'Miguel Henrique Batista', imagem: '/images/desenvolvedores/miguel.jpeg' },
      { id: 6, nome: 'Natan Mendes Araújo', imagem: '/images/desenvolvedores/natan.jpeg' },
      { id: 7, nome: 'Tufy Elias Silva', imagem: '/images/desenvolvedores/tufy.jpeg' },
    ];
  protected readonly copiasDesenvolvedores = computed(() => {
    const larguraGrupo = this.desenvolvedores.length * (224 + 24);
    const quantidade = Math.max(2, Math.ceil(this.larguraTela() / larguraGrupo) + 1);
    return Array.from({ length: quantidade }, (_, indice) => indice);
  });
  protected readonly desenvolvedoresPausados = signal(false);
  protected readonly imagensComErro = signal<string[]>([]);
  protected readonly colunasFotos = computed(() => {
    const fotos = this.conteudo().carrossel;
    return Array.from({ length: Math.ceil(fotos.length / 2) }, (_, indice) =>
      fotos.slice(indice * 2, indice * 2 + 2),
    );
  });
  protected readonly copiasMosaico = computed(() => {
    const larguraColuna = this.larguraTela() <= 768 ? 280 : 424;
    const larguraGrupo = Math.max(1, this.colunasFotos().length) * larguraColuna;
    const quantidade = Math.max(2, Math.ceil(this.larguraTela() / larguraGrupo) + 1);
    return Array.from({ length: quantidade }, (_, indice) => indice);
  });

  protected atualizarLargura(): void {
    this.larguraTela.set(window.innerWidth);
  }

  constructor() {
    this.carregarConteudo();
  }

  protected carregarConteudo(): void {
    if (this.carregando()) return;
    this.carregando.set(true);
    this.erro.set(false);
    this.secoesCarregadas.clear();
    this.carregandoSecoes.set(true);
    this.diretoria?.carregar();
    this.unidades?.carregar();
    this.totalUnidades.set(null);
    this.indicadores.set(null);
    forkJoin({
      indicadores: this.sobrePublicoService.obterIndicadores().pipe(catchError(() => of(null))),
      totalUnidades: this.sobrePublicoService.obterTotalUnidades().pipe(catchError(() => of(null))),
      conteudo: this.sobrePublicoService.obterConteudo(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ indicadores, totalUnidades, conteudo }) => {
          this.indicadores.set(indicadores);
          this.totalUnidades.set(totalUnidades);
          this.conteudo.set(conteudo);
          this.indiceHistoria.set(0);
          this.imagensComErro.set([]);
          this.carregando.set(false);
          this.posicionarFragmento();
        },
        error: () => {
          this.erro.set(true);
          this.carregando.set(false);
        },
      });
  }

  protected aoCarregarSecao(secao: 'diretoria' | 'unidades', sucesso = true): void {
    if (this.secoesCarregadas.has(secao)) return;
    if (!sucesso) this.erro.set(true);
    this.secoesCarregadas.add(secao);
    if (this.secoesCarregadas.size < 2) return;
    this.carregandoSecoes.set(false);
    this.posicionarFragmento();
  }

  private posicionarFragmento(): void {
    if (this.carregandoPagina() || this.erro()) return;
    afterNextRender(
      () => {
        const fragmento = this.route.snapshot.fragment;
        if (fragmento) document.getElementById(fragmento)?.scrollIntoView({ block: 'start' });
      },
      { injector: this.injector },
    );
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
