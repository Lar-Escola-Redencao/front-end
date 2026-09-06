import { Component, ChangeDetectorRef, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { ModalLayout } from '../../../../../components/modal-layout/modal-layout';
import { Paginacao } from '../../../../../components/paginacao/paginacao';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '../../../../../components/tabela-layout/tabela-layout';
import { ComponentComAlteracoesNaoSalvas } from '../../../../../shared/guards/can-deactivate.guard';
import { AtualizarDiretoriaDTO, CriarDiretoriaDTO, Diretoria } from '../../../../../shared/models/diretoria.model';
import { DiretoriaService } from '../../../../../shared/services/content-management/diretoria/diretoria.service';
import { Alertas } from '../../../../../shared/utils/alerts';
import { mapearErrosFormulario, validarImagem } from '../../../../../shared/utils/form-validations';
import {
  CampoOrdenacao,
  alternarOrdenacao,
  analisarOrdenacao,
  lerParametrosPagina
} from '../../../../../shared/utils/paginacao-url';

@Component({
  selector: 'app-diretoria',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    Paginacao,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule
  ],
  templateUrl: './diretoria.component.html',
  styleUrls: ['./diretoria.component.css']
})
export class DiretoriaComponent implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  diretores: Diretoria[] = [];

  pagina = 0;
  tamanho = 10;
  sort: string | undefined;
  ordenacao: CampoOrdenacao | null = null;
  totalElementos = 0;
  totalPaginas = 0;
  carregandoLista = false;
  erroLista = false;

  private routeSub?: Subscription;

  colunas: TabelaColuna<Diretoria>[] = [
    { chave: 'foto', titulo: 'Foto', tipo: 'imagem' },
    { chave: 'nome', titulo: 'Nome', principalMobile: true, ordenavel: true },
    { chave: 'cargo', titulo: 'Cargo', ordenavel: true },
    { chave: 'ativo', titulo: 'Exibição', tipo: 'status', ordenavel: true }
  ];

  acoesTabela: TabelaAcao<Diretoria>[] = [
    { icone: 'edit', tooltip: 'Editar', acao: 'editar' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir' }
  ];

  modalAberto = false;
  modoEdicao = false;
  diretoriaSelecionadaId: number | null = null;
  formDiretoria: FormGroup;
  erros: { [key: string]: string } = {};
  arquivoSelecionado: File | null = null;
  nomeArquivoSelecionado = '';
  previewUrl: string | null = null;
  isLoading = false;
  isCarregandoEdicao = false;
  modalTremendo = false;
  valoresOriginaisDoFormulario: any = null;

  constructor(
    private diretoriaService: DiretoriaService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.formDiretoria = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(150)]],
      cargo: ['', [Validators.required, Validators.maxLength(100)]],
      foto: [null, [Validators.required, validarImagem()]],
      ativo: [true]
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);
      this.carregarDiretores();
    });
  }

  ngOnDestroy(): void {
    this.revogarPreviewSeNecessario();
    this.routeSub?.unsubscribe();
  }

  carregarDiretores(): void {
    if (this.carregandoLista) {
      return;
    }

    this.carregandoLista = true;
    this.erroLista = false;

    this.diretoriaService.listarTodos(this.pagina, this.tamanho, this.sort).subscribe({
      next: (resposta) => {
        this.diretores = resposta.content;
        this.totalElementos = resposta.page.totalElements;
        this.totalPaginas = resposta.page.totalPages;
        this.carregandoLista = false;

        if (this.diretores.length === 0 && this.pagina > 0) {
          this.irParaPagina(Math.max(0, resposta.page.totalPages - 1));
          return;
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.carregandoLista = false;
        this.erroLista = true;
        this.toastr.error('Não foi possivel carregar a lista da diretoria.', 'Erro');
        this.cdr.detectChanges();
      }
    });
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

  abrirCadastro(): void {
    this.modalAberto = true;
    this.modoEdicao = false;
    this.diretoriaSelecionadaId = null;
    this.isLoading = false;
    this.isCarregandoEdicao = false;
    this.erros = {};
    this.definirArquivo(null);
    this.configurarValidadoresFoto(true);
    this.formDiretoria.reset({
      nome: '',
      cargo: '',
      foto: null,
      ativo: true
    });
    this.formDiretoria.markAsPristine();
    this.formDiretoria.markAsUntouched();
    this.valoresOriginaisDoFormulario = this.formDiretoria.getRawValue();
  }

  abrirEdicao(diretoria: Diretoria): void {
    this.modalAberto = true;
    this.modoEdicao = true;
    this.diretoriaSelecionadaId = diretoria.id;
    this.isLoading = false;
    this.isCarregandoEdicao = true;
    this.erros = {};
    this.definirArquivo(null);
    this.configurarValidadoresFoto(false);

    this.diretoriaService.buscarPorId(diretoria.id).subscribe({
      next: (dados: Diretoria) => {
        this.formDiretoria.reset({
          nome: dados.nome,
          cargo: dados.cargo,
          foto: null,
          ativo: dados.ativo
        });
        this.previewUrl = this.diretoriaService.fotoUrl(dados.foto);
        this.valoresOriginaisDoFormulario = this.formDiretoria.getRawValue();
        this.formDiretoria.markAsPristine();
        this.formDiretoria.markAsUntouched();
        this.isCarregandoEdicao = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Não foi possivel carregar os dados deste membro.', 'Erro');
        this.fecharModalSemConfirmacao();
        this.isCarregandoEdicao = false;
        this.cdr.detectChanges();
      }
    });
  }

  executarAcao(evento: { tipo: string; linha: Diretoria }): void {
    if (evento.tipo === 'editar') {
      this.abrirEdicao(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir') {
      this.excluirDiretoria(evento.linha);
    }
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao) {
      return this.formDiretoria.dirty || this.arquivoSelecionado !== null;
    }

    if (this.arquivoSelecionado !== null) {
      return true;
    }

    const valorAtual = {
      nome: this.formDiretoria.get('nome')?.value,
      cargo: this.formDiretoria.get('cargo')?.value,
      ativo: this.formDiretoria.get('ativo')?.value,
      foto: null
    };

    const valorOriginal = {
      nome: this.valoresOriginaisDoFormulario?.nome,
      cargo: this.valoresOriginaisDoFormulario?.cargo,
      ativo: this.valoresOriginaisDoFormulario?.ativo,
      foto: null
    };

    return JSON.stringify(valorAtual) !== JSON.stringify(valorOriginal);
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    if (!this.modalAberto || this.isCarregandoEdicao) {
      return false;
    }

    return this.temAlteracoes;
  }

  fecharModal(): void {
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      this.fecharModalSemConfirmacao();
      return;
    }

    Alertas.confirmarDescarte().then((confirmado: boolean) => {
      this.ngZone.run(() => {
        if (confirmado) {
          this.fecharModalSemConfirmacao();
        } else {
          this.dispararTremorModal();
        }

        this.cdr.detectChanges();
      });
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  verificarErros(): void {
    this.erros = mapearErrosFormulario(this.formDiretoria);
  }

  selecionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    const fotoControl = this.formDiretoria.get('foto');
    fotoControl?.setValue(arquivo);
    fotoControl?.markAsDirty();
    fotoControl?.updateValueAndValidity();
    this.formDiretoria.markAsDirty();
    this.verificarErros();

    if (fotoControl?.invalid) {
      this.revogarPreviewSeNecessario();
      this.arquivoSelecionado = null;
      this.nomeArquivoSelecionado = '';
      this.previewUrl = null;
      input.value = '';
      fotoControl.markAsTouched();
      fotoControl.markAsDirty();
      this.verificarErros();
      this.cdr.detectChanges();
      return;
    }

    this.definirArquivo(arquivo);
    this.cdr.detectChanges();
  }

  salvar(): void {
    this.formDiretoria.markAllAsTouched();
    this.verificarErros();

    if (this.formDiretoria.invalid) {
      return;
    }

    if (this.modoEdicao && !this.temAlteracoes) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoading = true;

    const { nome, cargo, ativo } = this.formDiretoria.value;

    if (this.modoEdicao) {
      const dto: AtualizarDiretoriaDTO = {
        nome,
        cargo,
        ativo,
        foto: this.arquivoSelecionado
      };

      this.diretoriaService.atualizar(this.diretoriaSelecionadaId!, dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarDiretores();
          this.toastr.success('Membro da diretoria atualizado com sucesso.', 'Sucesso');
        },
        error: (err: any) => this.tratarErro(err, 'Erro ao atualizar membro da diretoria.')
      });

      return;
    }

    const dto: CriarDiretoriaDTO = {
      nome,
      cargo,
      foto: this.arquivoSelecionado!
    };

    this.diretoriaService.criar(dto).subscribe({
      next: () => {
        this.isLoading = false;
        this.fecharModalSemConfirmacao();
        this.carregarDiretores();
        this.toastr.success('Membro da diretoria cadastrado com sucesso.', 'Sucesso');
      },
      error: (err: any) => this.tratarErro(err, 'Erro ao cadastrar membro da diretoria.')
    });
  }

  excluirDiretoria(diretoria: Diretoria): void {
    if (!diretoria.id) {
      this.toastr.error('Erro ao excluir membro da diretoria.', 'Erro');
      return;
    }

    Alertas.confirmarExclusao().then((confirmado: boolean) => {
      this.ngZone.run(() => {
        if (!confirmado) {
          return;
        }

        this.isLoading = true;

        this.diretoriaService.delete(diretoria.id).subscribe({
          next: () => {
            this.isLoading = false;
            this.carregarDiretores();
            this.toastr.success('Membro da diretoria excluido com sucesso.', 'Sucesso');
            this.cdr.detectChanges();
          },
          error: (err: any) => this.tratarErro(err, 'Erro ao excluir membro da diretoria.')
        });
      });
    });
  }

  private configurarValidadoresFoto(obrigatoria: boolean): void {
    const validadores = obrigatoria
      ? [Validators.required, validarImagem()]
      : [validarImagem()];

    this.formDiretoria.get('foto')?.setValidators(validadores);
    this.formDiretoria.get('foto')?.updateValueAndValidity();
  }

  private definirArquivo(arquivo: File | null): void {
    this.revogarPreviewSeNecessario();
    this.arquivoSelecionado = arquivo;
    this.nomeArquivoSelecionado = arquivo?.name ?? '';
    this.previewUrl = arquivo ? URL.createObjectURL(arquivo) : null;
    this.formDiretoria?.get('foto')?.setValue(arquivo);
  }

  private revogarPreviewSeNecessario(): void {
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  private fecharModalSemConfirmacao(): void {
    this.isLoading = false;
    this.modalAberto = false;
    this.modalTremendo = false;
    this.isCarregandoEdicao = false;
    this.diretoriaSelecionadaId = null;
    this.erros = {};
    this.definirArquivo(null);
    this.configurarValidadoresFoto(true);
    this.formDiretoria.reset({
      nome: '',
      cargo: '',
      foto: null,
      ativo: true
    });
    this.formDiretoria.markAsPristine();
    this.formDiretoria.markAsUntouched();
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  private tratarErro(err: any, mensagemPadrao: string): void {
    this.isLoading = false;
    const mensagem = err?.error?.detail || err?.error?.message || mensagemPadrao;
    this.toastr.error(mensagem, 'Erro');
    this.cdr.detectChanges();
  }
}
