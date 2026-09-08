import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  mapearErrosFormulario,
  validarDocumento
} from 'src/app/shared/utils/form-validations';
import { Alertas } from 'src/app/shared/utils/alerts';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaLayout,
  TabelaColuna,
  TabelaAcao
} from '@components/tabela-layout/tabela-layout';
import { Paginacao } from '@components/paginacao/paginacao';

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
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    Paginacao,
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

  // --- TABELAS ---
  documentos: DocumentoExibicao[] = [];

  /** Lista completa de seções (não paginada), usada só pelo <select> do modal de documento. */
  secoesParaSelecao: Secao[] = [];

  colunasDocumentos: TabelaColuna<DocumentoExibicao>[] = [
    { chave: 'titulo', titulo: 'Documento', principalMobile: true, ordenavel: true },
    { chave: 'secaoTitulo', titulo: 'Seção', ordenavel: true, campoOrdenacao: 'secao.titulo' },
    { chave: 'arquivo', titulo: 'Documento', tipo: 'documento' },
    { chave: 'tipo', titulo: 'Tipo' }
  ];

  colunasSecoes: TabelaColuna<Secao>[] = [
    { chave: 'titulo', titulo: 'Nome da Seção', principalMobile: true, ordenavel: true },
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
        '',
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

      this.carregarListaAtiva();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  mudarAba(aba: 'documentos' | 'secoes'): void {
    if (aba === this.abaAtiva) {
      return;
    }

    this.navegar({ aba, page: 0, sort: null });
  }

  get mensagemVazia(): string {
    return this.abaAtiva === 'documentos'
      ? 'Nenhum documento cadastrado.'
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
    if (this.carregandoLista) {
      return;
    }

    this.carregandoLista = true;
    this.erroLista = false;

    this.transparenciaService.listarDocumentosAdmin(this.pagina, this.tamanho, this.sort).subscribe({
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
    if (this.carregandoLista) {
      return;
    }

    this.carregandoLista = true;
    this.erroLista = false;

    this.transparenciaService.listarSecoesAdmin(this.pagina, this.tamanho, this.sort).subscribe({
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

  /** Lista completa (uma única página grande), pro <select> do modal de documento. */
  carregarSecoesParaSelecao(): void {
    this.transparenciaService.listarSecoesAdmin(0, TAMANHO_PAGINA_MAXIMO).subscribe({
      next: (resposta) => {
        this.secoesParaSelecao = resposta.content;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Erro ao carregar seções.', 'Erro');
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

  irParaPagina(pagina: number): void {
    this.navegar({ page: pagina });
  }

  mudarTamanhoPagina(tamanho: number): void {
    this.navegar({ page: 0, size: tamanho });
  }

  ordenarPor(campo: string): void {
    this.navegar({ page: 0, sort: alternarOrdenacao(this.ordenacao, campo) });
  }

  private navegar(queryParams: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  // --- CONTROLE DE MODAL, GUARDS E ALERTAS ---
  abrirModal(tipo: 'documento' | 'secao', itemEdicao?: any) {
    this.modalAberto = tipo;
    this.isLoading = false;

    if (tipo === 'secao') {
      this.errosSecao = {};
      if (itemEdicao) {
        this.modoEdicao = true;
        this.secaoSelecionadaId = itemEdicao.id;
        this.formSecao.patchValue({
          titulo: itemEdicao.titulo,
          ativo: itemEdicao.ativo ?? true
        });
      } else {
        this.modoEdicao = false;
        this.secaoSelecionadaId = null;
        this.formSecao.reset({
          titulo: '',
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
        secaoId: '',
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
          secaoId: '',
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
    if (this.formDocumento.get('arquivo')?.dirty) return true;

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
        this.toastr.success(this.modoEdicao ? 'Seção atualizada!' : 'Seção criada!', 'Sucesso');
        this.fecharModalSemConfirmacao();
        this.cdr.detectChanges();
        this.carregarListaAtiva();
        this.carregarSecoesParaSelecao();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastr.error(err.error?.message || 'Erro ao salvar seção.', 'Erro');
        this.cdr.detectChanges();
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
  executarAcao(evento: { tipo: string; linha: any; }) {
    const isSecao = this.abaAtiva === 'secoes';

    if (evento.tipo === 'editar') {
      this.abrirModal(isSecao ? 'secao' : 'documento', evento.linha);
    }

    if (evento.tipo === 'excluir') {
      Alertas.confirmarExclusao().then((confirmado) => {
        if (!confirmado) return;

        const request = isSecao
          ? this.transparenciaService.deletarSecao(evento.linha.id)
          : this.transparenciaService.deletarDocumento(evento.linha.id);

        request.subscribe({
          next: () => {
            this.toastr.success('Item excluído com sucesso!', 'Sucesso');
            this.carregarListaAtiva();
            if (isSecao) {
              this.carregarSecoesParaSelecao();
            }
          },
          error: () => {
            this.toastr.error('Erro ao excluir item.', 'Erro');
          }
        });
      });
    }
  }
}
