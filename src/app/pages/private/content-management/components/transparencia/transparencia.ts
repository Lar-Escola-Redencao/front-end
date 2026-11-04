import { AnexoDrop } from 'src/app/shared/directives/anexo-drop';
import { AbasResponsivas } from 'src/app/shared/directives/abas-responsivas';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subscription, expand, firstValueFrom, reduce } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import {
  mapearErrosFormulario,
  validarDocumento
} from 'src/app/shared/utils/form-validations';
import { Alertas } from 'src/app/shared/utils/alerts';
import { visualizarArquivoComVerificacao } from 'src/app/shared/utils/arquivo-acesso';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaLayout,
  TabelaColuna,
  TabelaAcao
} from '@components/tabela-layout/tabela-layout';
import { Paginacao } from '@components/paginacao/paginacao';
import { BarraBusca } from '@components/barra-busca/barra-busca';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DocumentoAdmin, Secao, TransparenciaService } from './transparencia.service';
import {
  CampoOrdenacao,
  TAMANHO_PAGINA_MAXIMO,
  alternarOrdenacao,
  analisarOrdenacao,
  lerParametrosPagina
} from 'src/app/shared/utils/paginacao-url';

interface DocumentoExibicao extends DocumentoAdmin {
  tipo: string;
}

@Component({
  selector: 'app-transparencia',
  standalone: true,
  imports: [
    AnexoDrop,
    AbasResponsivas,
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    Paginacao,
    BarraBusca,
    MatFormFieldModule,
    MatInputModule,
    MatSelect,
    MatOption,
    MatSlideToggleModule
  ],
  templateUrl: './transparencia.html',
  styleUrl: './transparencia.css',
})
export class Transparencia implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  // Controle de abas
  abaAtiva: 'documentos' | 'secoes' = 'documentos';

  // Controles gerais de modal
  modalAberto: 'documento' | 'secao' | null = null;
  modoEdicao = false;
  isLoading = false;
  modalTremendo = false;

  // --- PAGINAÇÃO (compartilhada pela aba ativa) ---
  pagina = 0;
  tamanho = 10;
  sort: string | undefined;
  ordenacao: CampoOrdenacao | null = null;
  totalElementos = 0;
  totalPaginas = 0;
  carregandoLista = false;
  erroLista = false;

  private routeSub?: Subscription;
  private listaSub?: Subscription;
  private secoesSub?: Subscription;

  /** Termo da barra de busca, espelhado em ?search= na URL. */
  busca = '';

  // --- TABELAS ---
  documentos: DocumentoExibicao[] = [];
  documentosIndisponiveis = new Set<string>();
  private timeoutsDocumentosIndisponiveis = new Map<string, ReturnType<typeof setTimeout>>();

  /** Todas as seções, usadas no filtro e no cadastro de documentos. */
  secoesParaSelecao: Secao[] = [];
  secaoFiltroId: number | null = null;
  carregandoSecoes = false;
  private secoesCarregadas = false;

  colunasDocumentos: TabelaColuna<DocumentoExibicao>[] = [
    { chave: 'titulo', titulo: 'Documento', principalMobile: true, ordenavel: true },
    { chave: 'secaoTitulo', titulo: 'Seção', ordenavel: true, campoOrdenacao: 'secao.titulo' },
    {
      chave: 'arquivo',
      titulo: 'Documento',
      tipo: 'documento',
      documentoLabel: 'Visualizar',
      documentoTitle: 'Visualizar documento',
      documentoIndisponivel: linha => this.documentoIndisponivel(linha),
      aoClicarDocumento: (linha, url, event) => this.visualizarDocumento(event, linha, url)
    },
    { chave: 'tipo', titulo: 'Tipo' }
  ];

  colunasSecoes: TabelaColuna<Secao>[] = [
    { chave: 'titulo', titulo: 'Nome da Seção', principalMobile: true, ordenavel: true },
    { chave: 'conteudo', titulo: 'Descrição', formatar: (valor) => String(valor || '').trim() || '-'},
    { chave: 'ativo', titulo: 'Exibição', tipo: 'status', ordenavel: true }
  ];

  acoesTabela: TabelaAcao<any>[] = [
    { icone: 'edit', tooltip: 'Editar', acao: 'editar' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir' }
  ];

  // --- LÓGICA DE DOCUMENTOS ---
  documentoSelecionadoId: number | null = null;
  nomeDocumentoSelecionado = '';
  formDocumento: FormGroup;
  valoresOriginaisDocumento: any = null;
  errosDocumento: { [key: string]: string } = {};

  // --- LÓGICA DE SEÇÃO ---
  secoes: Secao[] = [];
  secaoSelecionadaId: number | null = null;
  formSecao: FormGroup;
  valoresOriginaisSecao: any = null;
  errosSecao: { [key: string]: string } = {};


  constructor(
    private fb: FormBuilder,
    private transparenciaService: TransparenciaService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.formSecao = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      conteudo: ['', [Validators.maxLength(500)]],
      ativo: [true]
    });

    this.formDocumento = this.fb.group({
      titulo: [
        '',
        [
          Validators.required,
          Validators.maxLength(150)
        ]
      ],

      secaoId: [
        null,
        Validators.required
      ],

      arquivo: [
        null,
        [
          Validators.required,
          validarDocumento()
        ]
      ]
    });
  }

  ngOnInit(): void {
    this.carregarSecoesParaSelecao();

    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);
      this.abaAtiva = params.get('aba') === 'secoes' ? 'secoes' : 'documentos';
      this.busca = params.get('search') ?? '';
      const secaoId = Number(params.get('secao'));
      this.secaoFiltroId = Number.isSafeInteger(secaoId) && secaoId > 0 ? secaoId : null;

      this.carregarListaAtiva();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.listaSub?.unsubscribe();
    this.secoesSub?.unsubscribe();
  }

  mudarAba(aba: 'documentos' | 'secoes'): void {
    if (aba === this.abaAtiva) {
      return;
    }

    this.navegar({ aba, page: 0, sort: null, search: null });
  }

  /** Atualiza a URL (?search=termo); o queryParamMap.subscribe refaz o GET sem recarregar a página. */
  buscar(termo: string): void {
    this.navegar({ page: 0, search: termo || null });
  }

  filtrarPorSecao(secaoId: number | null): void {
    this.navegar({ secao: secaoId, page: 0 });
  }

  get mensagemVazia(): string {
    if (this.busca) {
      return this.abaAtiva === 'documentos'
        ? `Nenhum documento encontrado para "${this.busca}".`
        : `Nenhuma seção encontrada para "${this.busca}".`;
    }
    return this.abaAtiva === 'documentos'
      ? (this.secaoFiltroId ? 'Nenhum documento cadastrado nesta seção.' : 'Nenhum documento cadastrado.')
      : 'Nenhuma seção cadastrada.';
  }

  tentarNovamente(): void {
    this.carregarListaAtiva();
  }

  // --- BUSCAS E ATUALIZAÇÕES DE LISTAGEM ---
  private carregarListaAtiva(): void {
    if (this.abaAtiva === 'secoes') {
      this.carregarSecoes();
    } else {
      this.carregarDocumentos();
    }
  }

  carregarDocumentos(): void {
    // Uma nova busca cancela a requisição anterior em andamento: vale sempre a mais recente.
    this.listaSub?.unsubscribe();

    this.carregandoLista = true;
    this.erroLista = false;

    this.listaSub = this.transparenciaService.listarDocumentosAdmin(this.pagina, this.tamanho, this.sort, this.busca || undefined, this.secaoFiltroId ?? undefined).subscribe({
      next: (resposta) => {
        this.documentos = resposta.content.map(doc => this.mapearDocumento(doc));
        this.totalElementos = resposta.page.totalElements;
        this.totalPaginas = resposta.page.totalPages;
        this.carregandoLista = false;

        if (this.documentos.length === 0 && this.pagina > 0) {
          this.irParaPagina(Math.max(0, resposta.page.totalPages - 1));
          return;
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.carregandoLista = false;
        this.erroLista = true;
        this.toastr.error('Erro ao carregar documentos.', 'Erro');
        this.cdr.detectChanges();
      }
    });
  }

  carregarSecoes(): void {
    this.listaSub?.unsubscribe();

    this.carregandoLista = true;
    this.erroLista = false;

    this.listaSub = this.transparenciaService.listarSecoesAdmin(this.pagina, this.tamanho, this.sort, this.busca || undefined).subscribe({
      next: (resposta) => {
        this.secoes = resposta.content;
        this.totalElementos = resposta.page.totalElements;
        this.totalPaginas = resposta.page.totalPages;
        this.carregandoLista = false;

        if (this.secoes.length === 0 && this.pagina > 0) {
          this.irParaPagina(Math.max(0, resposta.page.totalPages - 1));
          return;
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.carregandoLista = false;
        this.erroLista = true;
        this.toastr.error('Erro ao carregar seções.', 'Erro');
        this.cdr.detectChanges();
      }
    });
  }

  /** Percorre todas as páginas para não limitar os seletores às primeiras seções. */
  carregarSecoesParaSelecao(aoCarregar?: () => void): void {
    this.secoesSub?.unsubscribe();
    this.carregandoSecoes = true;
    this.secoesCarregadas = false;
    this.secoesSub = this.transparenciaService.listarSecoesAdmin(0, TAMANHO_PAGINA_MAXIMO).pipe(
      expand(resposta => resposta.page.number + 1 < resposta.page.totalPages
        ? this.transparenciaService.listarSecoesAdmin(resposta.page.number + 1, TAMANHO_PAGINA_MAXIMO)
        : EMPTY),
      reduce((secoes, resposta) => [...secoes, ...resposta.content], [] as Secao[])
    ).subscribe({
      next: (secoes) => {
        this.secoesParaSelecao = secoes;
        this.carregandoSecoes = false;
        this.secoesCarregadas = true;
        aoCarregar?.();
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregandoSecoes = false;
        this.toastr.error('Erro ao carregar seções.', 'Erro');
        this.cdr.detectChanges();
      }
    });
  }

  private mapearDocumento(doc: DocumentoAdmin): DocumentoExibicao {
    return {
      ...doc,
      tipo: doc.arquivo
        ? doc.arquivo.split('.').pop()?.toUpperCase() ?? 'N/A'
        : 'N/A'
    };
  }

  visualizarDocumento(event: Event, documento: DocumentoExibicao, url: string): void {
    event.preventDefault();
    if (this.documentoIndisponivel(documento)) {
      this.toastr.warning('Arquivo não encontrado ou indisponível.', 'Arquivo indisponível');
      return;
    }

    visualizarArquivoComVerificacao(url, arquivoUrl => this.transparenciaService.carregarArquivo(arquivoUrl), this.toastr, () => {
      this.bloquearDocumentoTemporariamente(documento);
    });
  }

  documentoIndisponivel(documento: DocumentoExibicao): boolean {
    return this.documentosIndisponiveis.has(this.chaveDocumento(documento));
  }

  private bloquearDocumentoTemporariamente(documento: DocumentoExibicao): void {
    const chave = this.chaveDocumento(documento);
    this.documentosIndisponiveis.add(chave);
    clearTimeout(this.timeoutsDocumentosIndisponiveis.get(chave));
    this.timeoutsDocumentosIndisponiveis.set(chave, setTimeout(() => {
      this.documentosIndisponiveis.delete(chave);
      this.timeoutsDocumentosIndisponiveis.delete(chave);
      this.cdr.detectChanges();
    }, 2000));
    this.cdr.detectChanges();
  }

  private chaveDocumento(documento: DocumentoExibicao): string {
    return documento.arquivo || String(documento.id);
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

  private navegar(queryParams: Record<string, any>): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  // --- CONTROLE DE MODAL, GUARDS E ALERTAS ---
  async abrirModal(tipo: 'documento' | 'secao', itemEdicao?: any): Promise<void> {
    if (tipo === 'documento' && !itemEdicao) {
      if (this.carregandoSecoes) return;
      if (!this.secoesCarregadas) {
        this.carregarSecoesParaSelecao(() => { void this.abrirModal('documento'); });
        return;
      }
      if (this.secoesParaSelecao.length === 0) {
        this.modalAberto = null;
        const resultado = await Swal.fire({
          title: 'Cadastre uma seção primeiro',
          text: 'Os documentos precisam estar vinculados a uma seção. Deseja cadastrar uma agora?',
          icon: 'info', showCancelButton: true,
          confirmButtonText: 'Cadastrar seção', cancelButtonText: 'Depois'
        });
        if (resultado.isConfirmed && await this.navegar({ aba: 'secoes', page: 0, sort: null, search: null, secao: null })) {
          this.abaAtiva = 'secoes';
          await this.abrirModal('secao');
          this.cdr.detectChanges();
        }
        return;
      }
    }
    this.modalAberto = tipo;
    this.isLoading = false;

    if (tipo === 'secao') {
      this.errosSecao = {};
      if (itemEdicao) {
        this.modoEdicao = true;
        this.secaoSelecionadaId = itemEdicao.id;
        this.formSecao.patchValue({
          titulo: itemEdicao.titulo,
          conteudo: itemEdicao.conteudo ?? '',
          ativo: itemEdicao.ativo ?? true
        });
      } else {
        this.modoEdicao = false;
        this.secaoSelecionadaId = null;
        this.formSecao.reset({
          titulo: '',
          conteudo: '',
          ativo: true
        });
      }
      this.valoresOriginaisSecao = this.formSecao.getRawValue();
    }

    if (tipo === 'documento') {
      this.errosDocumento = {};
      this.nomeDocumentoSelecionado = '';

      // Limpa estado anterior do formulário
      this.formDocumento.reset({
        titulo: '',
        secaoId: null,
        arquivo: null
      });

      this.formDocumento.markAsPristine();
      this.formDocumento.markAsUntouched();

      if (itemEdicao) {
        // ============================================
        // EDIÇÃO
        // ============================================

        this.modoEdicao = true;
        this.documentoSelecionadoId = itemEdicao.id;

        // Arquivo NÃO é obrigatório na edição.
        // Porém, se o usuário selecionar um novo,
        // ele será validado pelo validarDocumento().
        this.formDocumento.get('arquivo')?.setValidators([
          validarDocumento()
        ]);

        this.formDocumento.get('arquivo')?.updateValueAndValidity();

        this.formDocumento.patchValue({
          titulo: itemEdicao.titulo,
          secaoId: itemEdicao.secaoId,
          arquivo: null
        });

        this.nomeDocumentoSelecionado =
          itemEdicao.arquivo
            ? itemEdicao.arquivo.split('/').pop() ?? ''
            : '';

      } else {
        // ============================================
        // NOVO
        // ============================================

        this.modoEdicao = false;
        this.documentoSelecionadoId = null;

        this.formDocumento.get('arquivo')?.setValidators([
          Validators.required,
          validarDocumento()
        ]);

        this.formDocumento.get('arquivo')?.updateValueAndValidity();

        this.formDocumento.reset({
          titulo: '',
          secaoId: null,
          arquivo: null
        });

        this.nomeDocumentoSelecionado = '';
      }

      // Muito importante:
      // define o estado atual como o estado original.
      this.formDocumento.markAsPristine();
      this.formDocumento.markAsUntouched();

      this.valoresOriginaisDocumento =
        this.formDocumento.getRawValue();
    }
  }

  get temAlteracoesSecao(): boolean {
    if (!this.modoEdicao) return this.formSecao.dirty;
    return JSON.stringify(this.formSecao.getRawValue()) !== JSON.stringify(this.valoresOriginaisSecao);
  }

  get temAlteracoesDocumento(): boolean {
    if (!this.modoEdicao) return this.formDocumento.dirty;

    // Como File object quebra no JSON.stringify, comparamos manualmente no caso de arquivo alterado
    if (this.formDocumento.get('arquivo')?.value) return true;

    const valorAtual = { ...this.formDocumento.getRawValue(), arquivo: null };
    const valorOriginal = { ...this.valoresOriginaisDocumento, arquivo: null };
    return JSON.stringify(valorAtual) !== JSON.stringify(valorOriginal);
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    if (!this.modalAberto) return false;
    if (this.modalAberto === 'secao') return this.temAlteracoesSecao;
    if (this.modalAberto === 'documento') return this.temAlteracoesDocumento;
    return false;
  }

  fecharModal(): void {
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      this.modalAberto = null;
      return;
    }

    Alertas.confirmarDescarte().then((confirmado) => {
      this.ngZone.run(() => {
        if (confirmado) {
          this.modalAberto = null;
          this.formSecao.reset({
            titulo: '',
            conteudo: '',
            ativo: true
          });
          this.formDocumento.reset();
        } else {
          this.dispararTremorModal();
        }

        this.cdr.detectChanges();
      });
    });
  }

  private fecharModalSemConfirmacao(): void {
    this.isLoading = false;
    this.modalAberto = null;
    this.modalTremendo = false;
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  // --- MÉTODOS DE SALVAMENTO DE SEÇÃO ---
  verificarErrosSecao(): void {
    this.errosSecao = mapearErrosFormulario(this.formSecao);
  }

  salvarSecao(): void {
    this.formSecao.markAllAsTouched();
    this.verificarErrosSecao();
    if (this.formSecao.invalid) return;

    if (this.modoEdicao && !this.temAlteracoesSecao) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoading = true;
    const request = this.modoEdicao
      ? this.transparenciaService.atualizarSecao(this.secaoSelecionadaId!, this.formSecao.value)
      : this.transparenciaService.criarSecao(this.formSecao.value);

    request.subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.toastr.success(this.modoEdicao ? 'Seção atualizada!' : 'Seção criada!', 'Sucesso');
          this.fecharModalSemConfirmacao();
          this.cdr.detectChanges();
          this.carregarListaAtiva();
          this.carregarSecoesParaSelecao();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao salvar seção.', 'Erro');
          this.cdr.detectChanges();
        });
      }
    });
  }

  // --- MÉTODOS DE SALVAMENTO DE DOCUMENTO ---
  verificarErrosDocumento(): void {
    this.errosDocumento = mapearErrosFormulario(this.formDocumento);
  }

  selecionarDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    const controleArquivo = this.formDocumento.get('arquivo');

    controleArquivo?.setValue(arquivo);
    controleArquivo?.markAsDirty();

    this.formDocumento.markAsDirty();

    this.nomeDocumentoSelecionado = arquivo.name;

    this.verificarErrosDocumento();

    this.cdr.detectChanges();
  }

  salvarDocumento(): void {
    this.formDocumento.markAllAsTouched();
    this.verificarErrosDocumento();
    if (this.formDocumento.invalid) return;

    if (this.modoEdicao && !this.temAlteracoesDocumento) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoading = true;
    const { secaoId, titulo, arquivo } = this.formDocumento.value;

    const request = this.modoEdicao
      ? this.transparenciaService.atualizarDocumento(this.documentoSelecionadoId!, secaoId, titulo, arquivo)
      : this.transparenciaService.adicionarDocumento(secaoId, titulo, arquivo);

    request.subscribe({
      next: () => {
        this.toastr.success(this.modoEdicao ? 'Documento atualizado!' : 'Documento salvo!', 'Sucesso');
        this.fecharModalSemConfirmacao();
        this.cdr.detectChanges();
        this.carregarListaAtiva();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastr.error(err.error?.message || 'Erro ao salvar documento.', 'Erro');
        this.cdr.detectChanges();
      }
    });
  }

  // --- MÉTODOS DE AÇÃO DA TABELA (EDITAR / EXCLUIR) ---
  async executarAcao(evento: { tipo: string; linha: any; }): Promise<void> {
    const isSecao = this.abaAtiva === 'secoes';

    if (evento.tipo === 'editar') {
      await this.abrirModal(isSecao ? 'secao' : 'documento', evento.linha);
    }

    if (evento.tipo === 'excluir') {
      await this.excluirItem(evento.linha.id, isSecao);
    }
  }

  private async excluirItem(id: number, isSecao: boolean): Promise<void> {
    if (isSecao) {
      try {
        const documentos = await firstValueFrom(this.transparenciaService.listarDocumentosAdmin(0, 1, undefined, undefined, id));
        if (documentos.page.totalElements > 0) {
          this.toastr.warning('Exclua os documentos vinculados a esta seção antes de excluí-la.', 'Seção com documentos');
          return;
        }
      } catch {
        this.toastr.error('Não foi possível verificar os documentos vinculados à seção. Tente novamente.', 'Erro');
        return;
      }
    }

    if (!await Alertas.confirmarExclusao()) return;
    const request = isSecao
      ? this.transparenciaService.deletarSecao(id)
      : this.transparenciaService.deletarDocumento(id);
    request.subscribe({
      next: () => {
        this.toastr.success('Item excluído com sucesso!', 'Sucesso');
        if (isSecao) {
          if (this.secaoFiltroId === id) this.navegar({ secao: null, page: 0 });
          this.carregarSecoesParaSelecao();
        }
        this.carregarListaAtiva();
      },
      error: err => {
        const mensagem = err.error?.message || 'Erro ao excluir item.';
        if (isSecao && err.status === 409) this.toastr.warning(mensagem, 'Seção com documentos');
        else this.toastr.error(mensagem, 'Erro');
      }
    });
  }
}
