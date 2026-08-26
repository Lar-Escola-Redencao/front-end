import { Component, ChangeDetectorRef, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { DiretoriaService } from '../../services/diretoria.service';
import { AtualizarDiretoriaDTO, CriarDiretoriaDTO, Diretoria } from '../../models/diretoria.model';
import { ComponentComAlteracoesNaoSalvas } from '../../guards/can-deactivate.guard';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-diretoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './diretoria.component.html',
  styleUrls: ['./diretoria.component.css']
})
export class DiretoriaComponent implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  diretores: Diretoria[] = [];

  modalAberto = false;
  modoEdicao = false;
  diretoriaSelecionadaId: number | null = null;
  formDiretoria: FormGroup;
  erros: { [key: string]: string } = {};
  erroArquivo = '';
  arquivoSelecionado: File | null = null;
  previewUrl: string | null = null;
  isLoading = false;
  isCarregandoEdicao = false;
  modalTremendo = false;
  valoresOriginaisDoFormulario: any = null;

  private readonly mensagensErro: {
    [campo: string]: { [tipoErro: string]: string | ((err: any) => string) }
  } = {
      nome: {
        required: '⚠ Campo obrigatório.',
        maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.`
      },
      cargo: {
        required: '⚠ Campo obrigatório.',
        maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.`
      }
    };

  constructor(
    private diretoriaService: DiretoriaService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private ngZone: NgZone
  ) {
    this.formDiretoria = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(150)]],
      cargo: ['', [Validators.required, Validators.maxLength(100)]],
      ativo: [true]
    });
  }

  ngOnInit(): void {
    this.carregarDiretores();
  }

  ngOnDestroy(): void {
    this.revogarPreviewSeNecessario();
  }

  fotoUrl(caminho: string): string {
    return this.diretoriaService.fotoUrl(caminho);
  }

  // listagem

  carregarDiretores(): void {
    this.diretoriaService.listarTodos().subscribe({
      next: (dados) => {
        this.diretores = dados;
        setTimeout(() => this.cdr.detectChanges());
      },
      error: () => {
        this.toastr.error('Não foi possível carregar a lista da diretoria.', 'Erro');
      }
    });
  }

  // controle do modal (cadastro e edição)

  abrirCadastro(): void {
    this.modoEdicao = false;
    this.diretoriaSelecionadaId = null;
    this.formDiretoria.reset({ nome: '', cargo: '', ativo: true });
    this.erros = {};
    this.erroArquivo = '';
    this.isLoading = false;
    this.valoresOriginaisDoFormulario = null;
    this.definirArquivo(null);
    this.modalAberto = true;
  }

  abrirEdicao(diretoria: Diretoria): void {
    this.modoEdicao = true;
    this.diretoriaSelecionadaId = diretoria.id;
    this.erros = {};
    this.erroArquivo = '';
    this.isLoading = false;
    this.isCarregandoEdicao = true;
    this.definirArquivo(null);
    this.modalAberto = true;

    this.diretoriaService.buscarPorId(diretoria.id).subscribe({
      next: (dados) => {
        this.formDiretoria.patchValue({
          nome: dados.nome,
          cargo: dados.cargo,
          ativo: dados.ativo
        });
        this.previewUrl = this.fotoUrl(dados.foto);
        this.valoresOriginaisDoFormulario = this.formDiretoria.getRawValue();
        this.isCarregandoEdicao = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Não foi possível carregar os dados deste membro.', 'Erro');
        this.modalAberto = false;
        this.isCarregandoEdicao = false;
      }
    });
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao) return true;
    if (this.arquivoSelecionado) return true;
    return JSON.stringify(this.formDiretoria.getRawValue()) !== JSON.stringify(this.valoresOriginaisDoFormulario);
  }

  fecharModal(): void {
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      this.modalAberto = false;
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
          this.modalAberto = false;
          this.definirArquivo(null);
          this.cdr.detectChanges();
        } else {
          this.dispararTremorModal();
        }
      });
    });
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
    this.definirArquivo(null);
  }

  // proteção contra perda de dados

  formularioTemAlteracoesNaoSalvas(): boolean {
    if (!this.modalAberto || this.isCarregandoEdicao) return false;
    return this.modoEdicao ? this.temAlteracoes : (this.formDiretoria.dirty || this.arquivoSelecionado !== null);
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  // validações

  verificarErros(): void {
    const controles = this.formDiretoria.controls;
    this.erros = {};

    for (const campo in controles) {
      const controle = controles[campo];
      if (controle.invalid && (controle.dirty || controle.touched)) {
        const mensagensCampo = this.mensagensErro[campo] || {};
        for (const tipoErro in controle.errors) {
          const mensagem = mensagensCampo[tipoErro];
          if (mensagem) {
            this.erros[campo] = typeof mensagem === 'function'
              ? mensagem(controle.getError(tipoErro))
              : mensagem;
            break;
          }
        }
      }
    }
  }

  // arquivo (foto)

  aoSelecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files && input.files.length > 0 ? input.files[0] : null;

    if (!arquivo) {
      return;
    }

    if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
      this.erroArquivo = '⚠ Formato inválido. Envie um arquivo JPEG, PNG ou WEBP.';
      input.value = '';
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      this.erroArquivo = '⚠ A foto deve ter no máximo 5MB.';
      input.value = '';
      return;
    }

    this.erroArquivo = '';
    this.definirArquivo(arquivo);
  }

  private definirArquivo(arquivo: File | null): void {
    this.revogarPreviewSeNecessario();
    this.arquivoSelecionado = arquivo;
    this.previewUrl = arquivo ? URL.createObjectURL(arquivo) : null;
  }

  private revogarPreviewSeNecessario(): void {
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  // interações com backend

  salvar(): void {
    this.formDiretoria.markAllAsTouched();
    this.verificarErros();

    if (!this.modoEdicao && !this.arquivoSelecionado) {
      this.erroArquivo = '⚠ A foto é obrigatória.';
    }

    if (this.formDiretoria.invalid || this.erroArquivo) return;

    if (this.modoEdicao && !this.temAlteracoes) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoading = true;
    const { nome, cargo, ativo } = this.formDiretoria.value;

    if (this.modoEdicao) {
      const dto: AtualizarDiretoriaDTO = { nome, cargo, ativo, foto: this.arquivoSelecionado };
      this.diretoriaService.atualizar(this.diretoriaSelecionadaId!, dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarDiretores();
          this.toastr.success('Membro da diretoria atualizado com sucesso.', 'Sucesso');
        },
        error: (err) => this.tratarErro(err, 'Erro ao atualizar membro da diretoria.')
      });
    } else {
      const dto: CriarDiretoriaDTO = { nome, cargo, foto: this.arquivoSelecionado! };
      this.diretoriaService.criar(dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarDiretores();
          this.toastr.success('Membro da diretoria cadastrado com sucesso.', 'Sucesso');
        },
        error: (err) => this.tratarErro(err, 'Erro ao cadastrar membro da diretoria.')
      });
    }
  }

  private tratarErro(err: any, mensagemPadrao: string): void {
    this.isLoading = false;
    const mensagem = err?.error?.detail || err?.error?.message || mensagemPadrao;
    this.toastr.error(mensagem, 'Erro');
    setTimeout(() => this.cdr.detectChanges());
  }
}
