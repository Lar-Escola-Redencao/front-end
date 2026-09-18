import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import {
  mapearErrosFormulario,
  obterMensagemErro,
  validarAno,
  validarArquivo,
  validarImagem,
} from 'src/app/shared/utils/form-validations';
import { Alertas } from 'src/app/shared/utils/alerts';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { TabelaLayout, TabelaColuna, TabelaAcao } from '@components/tabela-layout/tabela-layout';
import { Paginacao } from '@components/paginacao/paginacao';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Secao, SobreService } from './sobre.service';
import {
  CampoOrdenacao,
  TAMANHO_PAGINA_MAXIMO,
  alternarOrdenacao,
  analisarOrdenacao,
  lerParametrosPagina,
} from 'src/app/shared/utils/paginacao-url';
import { environment } from 'src/environments/environment';

/** Título fixo que identifica as seções do carrossel — nunca aparece na UI. */
export const TITULO_CARROSSEL = 'Imagem Carrossel';

const REGEX_ANO = /^\d{4}$/;

type AbaSobre = 'texto' | 'carrossel' | 'historia';

interface ClassificacaoSecoes {
  texto: Secao | null;
  carrossel: Secao[];
  historia: Secao[];
}

@Component({
  selector: 'app-sobre',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    Paginacao,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './sobre.html',
  styleUrl: './sobre.css',
})
export class Sobre implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {
  readonly TOTAL_SLOTS_CARROSSEL = 10;

  abaAtiva: AbaSobre = 'texto';

  /** Carregamento/erro do fetch único usado pelas Abas 1 e 2 (texto + carrossel). */
  carregandoPagina = false;
  erroPagina = false;

  private routeSub?: Subscription;

  // ---------------------------------------------------------------
  // ABA 1 — TEXTO SOBRE (só edição, sem adicionar/excluir)
  // ---------------------------------------------------------------

  secaoTexto: Secao | null = null;
  formTexto: FormGroup;
  errosTexto: { [key: string]: string } = {};
  isLoadingTexto = false;
  private valoresOriginaisTexto: any = null;

  // ---------------------------------------------------------------
  // ABA 2 — IMAGENS CARROSSEL (10 slots fixos, só substituição)
  // ---------------------------------------------------------------

  slotsCarrossel: (Secao | null)[] = new Array(this.TOTAL_SLOTS_CARROSSEL).fill(null);
  previewSlot: (string | null)[] = new Array(this.TOTAL_SLOTS_CARROSSEL).fill(null);
  carregandoSlot: boolean[] = new Array(this.TOTAL_SLOTS_CARROSSEL).fill(false);

  // ---------------------------------------------------------------
  // ABA 3 — NOSSA HISTÓRIA (CRUD completo)
  // ---------------------------------------------------------------

  blocosHistoria: Secao[] = [];

  pagina = 0;
  tamanho = 10;
  sort: string | undefined;
  ordenacao: CampoOrdenacao | null = null;
  totalElementos = 0;
  totalPaginas = 0;
  carregandoLista = false;
  erroLista = false;

  modalHistoriaAberto = false;
  modoEdicaoHistoria = false;
  blocoSelecionadoId: number | null = null;
  formHistoria: FormGroup;
  errosHistoria: { [key: string]: string } = {};
  isLoadingHistoria = false;
  modalHistoriaTremendo = false;
  private valoresOriginaisHistoria: any = null;

  imagemPreviewHistoria: string | null = null;
  nomeArquivoHistoria = '';
  private imagemSelecionadaHistoria: File | null = null;

  colunasHistoria: TabelaColuna<Secao>[] = [
    { chave: 'titulo', titulo: 'Ano', principalMobile: true, ordenavel: true },
    { chave: 'conteudo', titulo: 'Descrição', formatar: (valor: string) => valor || '-' },
    { chave: 'imagem', titulo: 'Imagem', tipo: 'imagem' },
    { chave: 'ativo', titulo: 'Exibição', tipo: 'status', ordenavel: true },
  ];

  acoesTabela: TabelaAcao<Secao>[] = [
    { icone: 'edit', tooltip: 'Editar', acao: 'editar' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir' },
  ];

  constructor(
    private fb: FormBuilder,
    private sobreService: SobreService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.formTexto = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      conteudo: [''],
    });

    this.formHistoria = this.fb.group({
      titulo: ['', [Validators.required, validarAno()]],
      conteudo: [''],
      imagem: [null, [validarImagem()]],
      ativo: [true],
    });
  }

  ngOnInit(): void {
    // Texto e Carrossel não dependem de página/ordenação — carregam juntos,
    // uma vez, independente de qual aba está ativa.
    this.carregarSecoesBasicas();

    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);
      this.abaAtiva = this.lerAbaValida(params.get('aba'));

      if (this.abaAtiva === 'historia') {
        this.carregarHistoria();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private lerAbaValida(valor: string | null): AbaSobre {
    return valor === 'carrossel' || valor === 'historia' ? valor : 'texto';
  }

  mudarAba(aba: AbaSobre): void {
    if (aba === this.abaAtiva) {
      return;
    }

    this.navegar({ aba, page: 0, sort: null });
  }

  private navegar(queryParams: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  // ---------------------------------------------------------------
  // CLASSIFICAÇÃO DE SEÇÕES (regra de negócio pura, testável isolada)
  // ---------------------------------------------------------------

  /**
   * A Secao do back não tem campo de tipo, então a página Sobre decide a
   * que aba cada seção pertence pelo título: Carrossel usa sempre o mesmo
   * título fixo (TITULO_CARROSSEL); Nossa História é qualquer seção cujo
   * título é um ano de 4 dígitos; Texto Sobre é a primeira seção que sobra.
   */
  classificarSecoes(secoes: Secao[]): ClassificacaoSecoes {
    const carrossel = secoes.filter((secao) => secao.titulo === TITULO_CARROSSEL);
    const historia = secoes.filter((secao) => REGEX_ANO.test(secao.titulo));
    const texto =
      secoes.find((secao) => secao.titulo !== TITULO_CARROSSEL && !REGEX_ANO.test(secao.titulo)) ?? null;

    return { texto, carrossel, historia };
  }

  /** A grade do carrossel tem tamanho fixo: sempre 10 slots, nunca derivado da API. */
  montarSlotsCarrossel(secoesCarrossel: Secao[]): (Secao | null)[] {
    const ordenadas = [...secoesCarrossel].sort((a, b) => a.id - b.id);
    const slots: (Secao | null)[] = new Array(this.TOTAL_SLOTS_CARROSSEL).fill(null);

    ordenadas.slice(0, this.TOTAL_SLOTS_CARROSSEL).forEach((secao, indice) => {
      slots[indice] = secao;
    });

    return slots;
  }

  carregarSecoesBasicas(): void {
    this.carregandoPagina = true;
    this.erroPagina = false;

    this.sobreService.listarSecoesAdmin(0, TAMANHO_PAGINA_MAXIMO).subscribe({
      next: (resposta) => {
        this.ngZone.run(() => {
          const { texto, carrossel } = this.classificarSecoes(resposta.content);
          this.secaoTexto = texto;
          this.slotsCarrossel = this.montarSlotsCarrossel(carrossel);
          this.preencherFormTexto();
          this.carregandoPagina = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.carregandoPagina = false;
          this.erroPagina = true;
          this.toastr.error('Não foi possível carregar a página Sobre.', 'Erro');
          this.cdr.detectChanges();
        });
      },
    });
  }

  tentarNovamentePagina(): void {
    this.carregarSecoesBasicas();
  }

  // ---------------------------------------------------------------
  // ABA 1 — TEXTO SOBRE
  // ---------------------------------------------------------------

  private preencherFormTexto(): void {
    this.formTexto.reset({
      titulo: this.secaoTexto?.titulo ?? '',
      conteudo: this.secaoTexto?.conteudo ?? '',
    });
    this.formTexto.markAsPristine();
    this.valoresOriginaisTexto = this.formTexto.getRawValue();
  }

  get temAlteracoesTexto(): boolean {
    return JSON.stringify(this.formTexto.getRawValue()) !== JSON.stringify(this.valoresOriginaisTexto);
  }

  verificarErrosTexto(): void {
    this.errosTexto = mapearErrosFormulario(this.formTexto);
  }

  salvarTexto(): void {
    this.formTexto.markAllAsTouched();
    this.verificarErrosTexto();

    if (this.formTexto.invalid) {
      return;
    }

    if (!this.temAlteracoesTexto) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoadingTexto = true;
    const { titulo, conteudo } = this.formTexto.value;

    // Enquanto a seção de texto ainda não existe, Salvar cria o registro;
    // depois disso, sempre atualiza o mesmo id. Não é um botão de
    // "adicionar" — é a mesma ação Salvar em dois estados possíveis.
    const request = this.secaoTexto
      ? this.sobreService.atualizarSecao(this.secaoTexto.id, { titulo, conteudo, ativo: true })
      : this.sobreService.criarSecao({ titulo, conteudo, ativo: true });

    request.subscribe({
      next: (secao) => {
        this.ngZone.run(() => {
          this.isLoadingTexto = false;
          this.secaoTexto = secao;
          this.preencherFormTexto();
          this.toastr.success('Texto da página Sobre salvo!', 'Sucesso');
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.isLoadingTexto = false;
          this.toastr.error(err.error?.message || 'Erro ao salvar o texto.', 'Erro');
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ---------------------------------------------------------------
  // ABA 2 — IMAGENS CARROSSEL
  // ---------------------------------------------------------------

  imagemSlot(indice: number): string | null {
    if (this.previewSlot[indice]) {
      return this.previewSlot[indice];
    }

    const secao = this.slotsCarrossel[indice];
    return secao ? this.tratarImagem(secao.imagem) : null;
  }

  onArquivoSlotSelecionado(event: Event, indice: number): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    const erro = validarArquivo(arquivo, validarImagem());

    if (erro) {
      this.toastr.error(obterMensagemErro(erro), 'Erro');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.ngZone.run(() => {
        this.previewSlot[indice] = reader.result as string;
        this.cdr.detectChanges();
      });
    };
    reader.readAsDataURL(arquivo);

    this.enviarImagemSlot(indice, arquivo);
    input.value = '';
  }

  private enviarImagemSlot(indice: number, arquivo: File): void {
    this.carregandoSlot[indice] = true;
    const secaoExistente = this.slotsCarrossel[indice];

    // O título "Imagem Carrossel" nunca aparece na tela: é injetado aqui,
    // igual em todo slot, pra manter as seções do carrossel identificáveis
    // sem precisar de um campo de tipo que a Secao não tem.
    const request = secaoExistente
      ? this.sobreService.atualizarSecao(secaoExistente.id, {
          titulo: TITULO_CARROSSEL,
          conteudo: secaoExistente.conteudo ?? '',
          ativo: true,
          imagem: arquivo,
        })
      : this.sobreService.criarSecao({
          titulo: TITULO_CARROSSEL,
          ativo: true,
          imagem: arquivo,
        });

    request.subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.carregandoSlot[indice] = false;
          this.previewSlot[indice] = null;
          this.toastr.success('Imagem do carrossel atualizada!', 'Sucesso');
          // Recarrega pra esse slot passar a exibir a imagem persistida
          // em vez do preview local.
          this.carregarSecoesBasicas();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.carregandoSlot[indice] = false;
          this.previewSlot[indice] = null;
          this.toastr.error(err.error?.message || 'Erro ao enviar a imagem.', 'Erro');
          this.cdr.detectChanges();
        });
      },
    });
  }

  tratarImagem(caminho: string | null | undefined): string | null {
    if (!caminho) {
      return null;
    }

    if (caminho.startsWith('http://') || caminho.startsWith('https://') || caminho.startsWith('data:')) {
      return caminho;
    }

    return `${environment.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }

  // ---------------------------------------------------------------
  // ABA 3 — NOSSA HISTÓRIA (única com CRUD completo)
  // ---------------------------------------------------------------

  get mensagemVaziaHistoria(): string {
    return 'Nenhum bloco cadastrado.';
  }

  carregarHistoria(): void {
    this.carregandoLista = true;
    this.erroLista = false;

    this.sobreService.listarSecoesAdmin(this.pagina, this.tamanho, this.sort).subscribe({
      next: (resposta) => {
        this.ngZone.run(() => {
          // Limitação conhecida da modelagem atual: a Secao não tem campo
          // de tipo, então o back pagina TODAS as seções da página 2
          // (texto e carrossel incluídos) e o filtro pelo padrão de ano é
          // feito aqui. Isso pode deixar a página exibida com menos linhas
          // do que o "tamanho" configurado — só se resolve de verdade
          // quando a Secao ganhar um campo de tipo no back.
          this.blocosHistoria = resposta.content.filter((secao) => REGEX_ANO.test(secao.titulo));
          this.totalElementos = resposta.page.totalElements;
          this.totalPaginas = resposta.page.totalPages;
          this.carregandoLista = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.carregandoLista = false;
          this.erroLista = true;
          this.toastr.error('Não foi possível carregar Nossa História.', 'Erro');
          this.cdr.detectChanges();
        });
      },
    });
  }

  tentarNovamente(): void {
    this.carregarHistoria();
  }

  irParaPagina(pagina: number): void {
    this.navegar({ page: pagina });
  }

  mudarTamanhoPagina(tamanho: number): void {
    this.navegar({ page: 0, size: tamanho });
  }

  ordenarPor(campo: string): void {
    this.navegar({ page: 0, sort: alternarOrdenacao(this.ordenacao, campo) });
  }

  abrirModalHistoria(bloco?: Secao): void {
    this.modalHistoriaAberto = true;
    this.isLoadingHistoria = false;
    this.errosHistoria = {};
    this.imagemPreviewHistoria = null;
    this.nomeArquivoHistoria = '';
    this.imagemSelecionadaHistoria = null;

    if (bloco) {
      this.modoEdicaoHistoria = true;
      this.blocoSelecionadoId = bloco.id;
      this.formHistoria.reset({
        titulo: bloco.titulo,
        conteudo: bloco.conteudo ?? '',
        imagem: null,
        ativo: bloco.ativo,
      });
      this.imagemPreviewHistoria = this.tratarImagem(bloco.imagem);
    } else {
      this.modoEdicaoHistoria = false;
      this.blocoSelecionadoId = null;
      this.formHistoria.reset({
        titulo: '',
        conteudo: '',
        imagem: null,
        ativo: true,
      });
    }

    this.formHistoria.markAsPristine();
    this.valoresOriginaisHistoria = { ...this.formHistoria.getRawValue(), imagem: null };
  }

  get temAlteracoesHistoria(): boolean {
    if (this.formHistoria.get('imagem')?.dirty) {
      return true;
    }

    const valorAtual = { ...this.formHistoria.getRawValue(), imagem: null };
    return JSON.stringify(valorAtual) !== JSON.stringify(this.valoresOriginaisHistoria);
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.temAlteracoesTexto || (this.modalHistoriaAberto && this.temAlteracoesHistoria);
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  fecharModalHistoria(): void {
    if (!this.temAlteracoesHistoria) {
      this.fecharModalHistoriaSemConfirmacao();
      return;
    }

    Alertas.confirmarDescarte().then((confirmado) => {
      this.ngZone.run(() => {
        if (confirmado) {
          this.fecharModalHistoriaSemConfirmacao();
        } else {
          this.dispararTremorModalHistoria();
        }

        this.cdr.detectChanges();
      });
    });
  }

  private fecharModalHistoriaSemConfirmacao(): void {
    this.modalHistoriaAberto = false;
    this.modalHistoriaTremendo = false;
    this.isLoadingHistoria = false;
  }

  private dispararTremorModalHistoria(): void {
    this.modalHistoriaTremendo = true;
    setTimeout(() => {
      this.modalHistoriaTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  verificarErrosHistoria(): void {
    this.errosHistoria = mapearErrosFormulario(this.formHistoria);
  }

  onImagemHistoriaSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    const controle = this.formHistoria.get('imagem');
    controle?.setValue(arquivo);
    controle?.markAsDirty();
    controle?.markAsTouched();
    controle?.updateValueAndValidity();
    this.verificarErrosHistoria();

    if (controle?.invalid) {
      this.imagemSelecionadaHistoria = null;
      this.nomeArquivoHistoria = '';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.imagemSelecionadaHistoria = arquivo;
    this.nomeArquivoHistoria = arquivo.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagemPreviewHistoria = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(arquivo);
  }

  salvarHistoria(): void {
    this.formHistoria.markAllAsTouched();
    this.verificarErrosHistoria();

    if (this.formHistoria.invalid) {
      return;
    }

    if (this.modoEdicaoHistoria && !this.temAlteracoesHistoria) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoadingHistoria = true;
    const { titulo, conteudo, ativo } = this.formHistoria.value;
    const imagem = this.imagemSelecionadaHistoria ?? undefined;

    const request = this.modoEdicaoHistoria
      ? this.sobreService.atualizarSecao(this.blocoSelecionadoId!, { titulo, conteudo, ativo, imagem })
      : this.sobreService.criarSecao({ titulo, conteudo, ativo, imagem });

    request.subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.toastr.success(this.modoEdicaoHistoria ? 'Bloco atualizado!' : 'Bloco criado!', 'Sucesso');
          this.fecharModalHistoriaSemConfirmacao();
          this.carregarHistoria();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.isLoadingHistoria = false;
          this.toastr.error(err.error?.message || 'Erro ao salvar o bloco.', 'Erro');
          this.cdr.detectChanges();
        });
      },
    });
  }

  executarAcaoHistoria(evento: { tipo: string; linha: Secao }): void {
    if (evento.tipo === 'editar') {
      this.abrirModalHistoria(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir') {
      this.excluirBlocoHistoria(evento.linha);
    }
  }

  private excluirBlocoHistoria(bloco: Secao): void {
    Alertas.confirmarExclusao().then((confirmado) => {
      if (!confirmado) {
        return;
      }

      this.sobreService.deletarSecao(bloco.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toastr.success('Bloco excluído com sucesso!', 'Sucesso');
            this.carregarHistoria();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.toastr.error('Erro ao excluir bloco.', 'Erro');
            this.cdr.detectChanges();
          });
        },
      });
    });
  }
}
