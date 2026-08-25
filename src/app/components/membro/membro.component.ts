import { Component, OnInit, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MembroService } from '../../services/membro.service';
import { PapelService } from '../../services/papel.service';
import { Membro, CriarMembroDTO, AtualizarMembroDTO } from '../../models/membro.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ComponentComAlteracoesNaoSalvas } from '../../guards/can-deactivate.guard';

@Component({
  selector: 'app-membro',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './membro.component.html',
  styleUrls: ['./membro.component.css']
})
export class MembroComponent implements OnInit, ComponentComAlteracoesNaoSalvas {

  membros: Membro[] = [];
  membrosFiltrados: Membro[] = [];
  papeisDisponiveis: string[] = [];
  filtroPapel = '';
  papeis: { id: number, nome?: string, nomePapel?: string }[] = [];

  modalAberto = false;
  modoEdicao = false;
  membroSelecionadoId: number | null = null;
  formMembro: FormGroup;
  erros: { [key: string]: string } = {};
  mostrarSenha = false;
  mostrarConfirmarSenha = false;
  isLoading = false;
  modalTremendo = false;

  private readonly senhaRegex = /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

  private readonly mensagensErro: {
    [campo: string]: { [tipoErro: string]: string | ((err: any) => string) }
  } = {
      nomeCompleto: {
        required: '⚠ Campo obrigatório.',
        minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`,
        maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.`
      },
      email: {
        required: '⚠ Campo obrigatório.',
        email: '⚠ Digite um e-mail válido.',
        minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`,
        maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.`
      },
      senha: {
        required: '⚠ Campo obrigatório.',
        pattern: () => '⚠ A senha não contém os requisitos mínimos.',
        maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.`
      },
      confirmarSenha: {
        required: '⚠ Campo obrigatório.',
        senhasDiferentes: '⚠ As senhas não coincidem.'
      },
      cpf: {
        required: '⚠ Campo obrigatório.',
        minlength: '⚠ CPF incompleto.',
        maxlength: '⚠ CPF incompleto.'
      },
      telefone: {
        required: '⚠ Campo obrigatório.',
        minlength: '⚠ Telefone incompleto.',
        maxlength: '⚠ Telefone incompleto.'
      },
      endereco: {
        required: '⚠ Campo obrigatório.',
        minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`,
        maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.`
      },
      idPapel: {
        required: '⚠ Campo obrigatório.'
      }
    };

  constructor(
    private membroService: MembroService,
    private papelService: PapelService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private ngZone: NgZone
  ) {
    this.formMembro = this.fb.group({
      nomeCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email, Validators.minLength(5), Validators.maxLength(100)]],
      senha: [''],
      confirmarSenha: [''],
      cpf: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(14)]],
      endereco: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
      telefone: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(15)]],
      idPapel: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarPapeis();
    this.carregarMembros();

    // reavalia a confirmação de senha sempre que um dos dois campos mudar
    this.formMembro.get('senha')?.valueChanges.subscribe(() => this.checarSenhasIguais());
    this.formMembro.get('confirmarSenha')?.valueChanges.subscribe(() => this.checarSenhasIguais());
  }

  // senha: comparação e visibilidade

  private checarSenhasIguais(): void {
    const senha = this.formMembro.get('senha');
    const confirmarSenha = this.formMembro.get('confirmarSenha');
    if (!senha || !confirmarSenha) return;

    if (senha.value && confirmarSenha.value && senha.value !== confirmarSenha.value) {
      confirmarSenha.setErrors({ ...(confirmarSenha.errors || {}), senhasDiferentes: true });
    } else if (confirmarSenha.hasError('senhasDiferentes')) {
      const { senhasDiferentes, ...resto } = confirmarSenha.errors || {};
      confirmarSenha.setErrors(Object.keys(resto).length ? resto : null);
    }
  }

  alternarVisibilidadeSenha(campo: 'senha' | 'confirmarSenha'): void {
    if (campo === 'senha') {
      this.mostrarSenha = !this.mostrarSenha;
    } else {
      this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
    }
  }

  // listagem e filtros

  carregarPapeis(): void {
    this.papelService.listarTodos().subscribe({
      next: (dados) => {
        this.papeis = dados;
      },
      error: (err) => console.error('Erro ao carregar papéis da API:', err)
    });
  }

  carregarMembros(): void {
    this.membroService.listarTodos().subscribe({
      next: (dados) => {
        this.membros = dados;
        this.papeisDisponiveis = [...new Set(dados.map(m => m.nomePapel))];
        this.aplicarFiltro();

        setTimeout(() => {
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Erro na API:', err);
        this.toastr.error('Não foi possível carregar a lista de usuários.', 'Erro');
      }
    });
  }

  aplicarFiltro(): void {
    this.membrosFiltrados = this.filtroPapel
      ? this.membros.filter(m => m.nomePapel === this.filtroPapel)
      : this.membros;
  }

  // controle do modal (cadastro e edição)
  abrirCadastro(): void {
    this.modoEdicao = false;
    this.membroSelecionadoId = null;
    this.formMembro.reset();
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;

    this.formMembro.get('senha')?.setValidators([
      Validators.required,
      Validators.pattern(this.senhaRegex),
      Validators.maxLength(50)
    ]);
    this.formMembro.get('confirmarSenha')?.setValidators([Validators.required]);

    this.formMembro.get('senha')?.updateValueAndValidity();
    this.formMembro.get('confirmarSenha')?.updateValueAndValidity();
    this.modalAberto = true;
  }

  abrirEdicao(membro: Membro): void {
    this.modoEdicao = true;
    this.membroSelecionadoId = membro.id;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;

    this.formMembro.get('senha')?.clearValidators();
    this.formMembro.get('confirmarSenha')?.clearValidators();
    this.formMembro.get('senha')?.updateValueAndValidity();
    this.formMembro.get('confirmarSenha')?.updateValueAndValidity();

    this.formMembro.patchValue({
      ...membro,
      cpf: this.formatarCpf(membro.cpf),
      telefone: this.formatarTelefone(membro.telefone)
    });

    this.modalAberto = true;
  }

  fecharModal(): void {
    if (!this.formMembro.dirty) {
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
          this.formMembro.reset(); // Limpa os dados não salvos e tira o "dirty"
          this.cdr.detectChanges(); // <--- Adicione esta linha para forçar a atualização visual!
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

  // usado internamente após salvar com sucesso, sem pedir confirmação
  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
  }

  // proteção contra perda de dados

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.modalAberto && this.formMembro.dirty;
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  // validações e máscaras
  verificarErros(): void {
    const controles = this.formMembro.controls;
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

  aplicarMascaraCpf(event: any): void {
    let valor = event.target.value.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.substring(0, 11);

    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    this.formMembro.get('cpf')?.setValue(valor, { emitEvent: false });
    this.verificarErros();
  }

  aplicarMascaraTelefone(event: any): void {
    let valor = event.target.value.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.substring(0, 11);

    if (valor.length > 10) {
      valor = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (valor.length > 5) {
      valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (valor.length > 2) {
      valor = valor.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (valor.length > 0) {
      valor = valor.replace(/^(\d*)/, '($1');
    }

    this.formMembro.get('telefone')?.setValue(valor, { emitEvent: false });
  }

  private formatarCpf(valor: string): string {
    if (!valor) return '';
    let v = valor.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    return v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  private formatarTelefone(valor: string): string {
    if (!valor) return '';
    let v = valor.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);

    if (v.length > 10) {
      return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (v.length > 5) {
      return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (v.length > 2) {
      return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    }
    return v;
  }

  // interações com backend
  salvar(): void {
    this.formMembro.markAllAsTouched();
    this.verificarErros();

    if (this.formMembro.invalid) return;

    if (this.modoEdicao && !this.formMembro.dirty) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoading = true;

    if (this.modoEdicao) {
      const { senha, confirmarSenha, ...dadosEdicao } = this.formMembro.value;
      const dto: AtualizarMembroDTO = dadosEdicao;
      this.membroService.atualizar(this.membroSelecionadoId!, dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarMembros();
          this.toastr.success('Usuário atualizado com sucesso.', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao atualizar membro', 'Erro');
          setTimeout(() => this.cdr.detectChanges());
        }
      });
    } else {
      const { confirmarSenha, ...dadosCadastro } = this.formMembro.value;
      const dto: CriarMembroDTO = dadosCadastro;
      this.membroService.criar(dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarMembros();
          this.toastr.success('Usuário cadastrado com sucesso.', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao cadastrar membro', 'Erro');
          setTimeout(() => this.cdr.detectChanges());
        }
      });
    }
  }

  deletarMembro(id: number): void {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Essa ação não poderá ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e04b3a',
      cancelButtonColor: '#757575',
      reverseButtons: true
    }).then((resultado) => {
      if (resultado.isConfirmed) {
        this.membroService.deletar(id).subscribe({
          next: () => {
            this.carregarMembros();
            this.toastr.success('Usuário excluído com sucesso.', 'Sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir membro.', 'Erro')
        });
      }
    });
  }
}
