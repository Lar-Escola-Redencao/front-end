import { Component, OnInit, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaLayout,
  TabelaColuna,
  TabelaAcao
} from '@components/tabela-layout/tabela-layout';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { Secao, TransparenciaService } from './transparencia.service';

interface DocumentoTransparencia {
  id?: number;
  titulo: string;
  secao: string;
  secaoId?: number;
  tipo: string;
  dataAtualizacao: string;
}

@Component({
  selector: 'app-transparencia',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    MatFormFieldModule,
    MatInputModule,
    MatSelect,
    MatOption
  ],
  templateUrl: './transparencia.html',
  styleUrl: './transparencia.css',
})
export class Transparencia implements OnInit, ComponentComAlteracoesNaoSalvas {

  // Controle de abas
  abaAtiva: 'documentos' | 'secoes' = 'documentos';

  // Controles gerais de modal
  modalAberto: 'documento' | 'secao' | null = null;
  modoEdicao = false;
  isLoading = false;
  modalTremendo = false;

  // --- TABELAS ---
  documentos: DocumentoTransparencia[] = [];

  colunasDocumentos: TabelaColuna<DocumentoTransparencia>[] = [
    { chave: 'titulo', titulo: 'Documento' },
    { chave: 'secao', titulo: 'Seção' },
    { chave: 'tipo', titulo: 'Tipo', principalMobile: true },
    { chave: 'dataAtualizacao', titulo: 'Última atualização' }
  ];

  colunasSecoes: TabelaColuna<any>[] = [
    { chave: 'id', titulo: 'ID' },
    { chave: 'titulo', titulo: 'Nome da Seção', principalMobile: true }
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

  private readonly mensagensErroDocumento: { [campo: string]: { [tipoErro: string]: string | ((err: any) => string) } } = {
    titulo: { required: '⚠ O título do documento é obrigatório.' },
    secaoId: { required: '⚠ Selecione uma seção para o documento.' },
    arquivo: { required: '⚠ Anexe um arquivo PDF.' }
  };

  // --- LÓGICA DE SEÇÃO ---
  secoes: any[] = [];
  secaoSelecionadaId: number | null = null;
  formSecao: FormGroup;
  valoresOriginaisSecao: any = null;
  errosSecao: { [key: string]: string } = {};

  private readonly mensagensErroSecao: { [campo: string]: { [tipoErro: string]: string | ((err: any) => string) } } = {
    titulo: { 
      required: '⚠ O nome da seção é obrigatório.', 
      minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.` 
    }
  };

  constructor(
    private fb: FormBuilder,
    private transparenciaService: TransparenciaService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.formSecao = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]]
    });

    this.formDocumento = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(150)]],
      secaoId: ['', Validators.required],
      arquivo: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarSecoes();
  }

  // --- BUSCAS E ATUALIZAÇÕES DE LISTAGEM ---
  carregarSecoes(): void {
    this.transparenciaService.listarSecoes().subscribe({
      next: (dados: any) => {
        this.secoes = dados;
        this.atualizarTabelaDocumentos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Erro ao carregar seções.', 'Erro');
        this.cdr.detectChanges();
      }
    });
  }

  atualizarTabelaDocumentos(): void {
    const novosDocumentos: DocumentoTransparencia[] = [];
    
    this.secoes.forEach(secao => {
      if (secao.documentos && Array.isArray(secao.documentos)) {
        secao.documentos.forEach((doc: any) => {
          novosDocumentos.push({
            id: doc.id,
            titulo: doc.titulo,
            secao: secao.titulo,
            secaoId: secao.id,
            tipo: doc.arquivo ? doc.arquivo.split('.').pop().toUpperCase() : 'N/A', 
            dataAtualizacao: '-' 
          });
        });
      }
    });

    this.documentos = novosDocumentos;
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
        this.formSecao.patchValue({ titulo: itemEdicao.titulo });
      } else {
        this.modoEdicao = false;
        this.secaoSelecionadaId = null;
        this.formSecao.reset();
      }
      this.valoresOriginaisSecao = this.formSecao.getRawValue();
    }

    if (tipo === 'documento') {
      this.errosDocumento = {};
      this.nomeDocumentoSelecionado = '';
      
      if (itemEdicao) {
        this.modoEdicao = true;
        this.documentoSelecionadoId = itemEdicao.id;
        
        this.formDocumento.get('arquivo')?.clearValidators();
        this.formDocumento.get('arquivo')?.updateValueAndValidity();
        
        this.formDocumento.patchValue({ 
          titulo: itemEdicao.titulo,
          secaoId: itemEdicao.secaoId
        });
      } else {
        this.modoEdicao = false;
        this.documentoSelecionadoId = null;
        
        this.formDocumento.get('arquivo')?.setValidators([Validators.required]);
        this.formDocumento.get('arquivo')?.updateValueAndValidity();
        
        this.formDocumento.reset();
      }
      this.valoresOriginaisDocumento = this.formDocumento.getRawValue();
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

    Swal.fire({
      title: 'Descartar alterações?',
      text: 'Existem dados preenchidos que ainda não foram salvos. Deseja realmente sair?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, descartar',
      cancelButtonText: 'Continuar editando',
      confirmButtonColor: '#e04b3a',
      cancelButtonColor: '#757575',
      reverseButtons: true
    }).then((resultado) => {
      this.ngZone.run(() => {
        if (resultado.isConfirmed) {
          this.modalAberto = null;
          if (this.formSecao) this.formSecao.reset();
          if (this.formDocumento) this.formDocumento.reset();
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
    const controles = this.formSecao.controls;
    this.errosSecao = {};
    for (const campo in controles) {
      if (controles[campo].invalid && (controles[campo].dirty || controles[campo].touched)) {
        const erroAtivo = Object.keys(controles[campo].errors!)[0];
        const configErro = this.mensagensErroSecao[campo][erroAtivo];
        this.errosSecao[campo] = typeof configErro === 'function' ? configErro(controles[campo].getError(erroAtivo)) : configErro;
      }
    }
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
        this.carregarSecoes();
        this.cdr.detectChanges();
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
    const controles = this.formDocumento.controls;
    this.errosDocumento = {};
    for (const campo in controles) {
      if (controles[campo].invalid && (controles[campo].dirty || controles[campo].touched)) {
        const erroAtivo = Object.keys(controles[campo].errors!)[0];
        const configErro = this.mensagensErroDocumento[campo][erroAtivo];
        this.errosDocumento[campo] = typeof configErro === 'function' ? configErro(controles[campo].getError(erroAtivo)) : configErro;
      }
    }
  }

  selecionarDocumento(event: Event) {
    const arquivo = (event.target as HTMLInputElement).files?.[0];
    if (arquivo) {
      this.nomeDocumentoSelecionado = arquivo.name;
      this.formDocumento.patchValue({ arquivo: arquivo });
      this.formDocumento.get('arquivo')?.markAsDirty();
      this.verificarErrosDocumento();
    }
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
        this.carregarSecoes();
        this.cdr.detectChanges();
      },
      error: (err : any) => {
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
      Swal.fire({
        title: 'Tem certeza?',
        text: 'Esta ação não poderá ser desfeita.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e04b3a',
        cancelButtonColor: '#757575',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
      }).then((resultado) => {
        if (resultado.isConfirmed) {
          const request = isSecao 
            ? this.transparenciaService.deletarSecao(evento.linha.id)
            : this.transparenciaService.deletarDocumento(evento.linha.id);

          request.subscribe({
            next: () => {
              this.toastr.success('Item excluído com sucesso!', 'Sucesso');
              this.carregarSecoes();
            },
            error: () => this.toastr.error('Erro ao excluir item.', 'Erro')
          });
        }
      });
    }
  }
}