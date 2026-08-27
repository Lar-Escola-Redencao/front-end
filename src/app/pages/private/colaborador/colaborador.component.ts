import { Component, OnInit, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { ColaboradorService } from 'src/app/shared/services/colaborador/colaborador.service';
import { PapelService } from 'src/app/shared/services/colaborador/papel.service';
import { AtualizarColaboradorDTO, Colaborador, CriarColaboradorDTO } from 'src/app/shared/models/colaborador.model';

@Component({
  selector: 'app-colaborador',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './colaborador.component.html',
  styleUrls: ['./colaborador.component.css']
})
export class ColaboradorComponent implements OnInit, ComponentComAlteracoesNaoSalvas {

  colaboradores: Colaborador[] = [];
  colaboradoresFiltrados: Colaborador[] = [];
  papeisDisponiveis: string[] = [];
  filtroPapel = '';
  papeis: { id: number, nome?: string, nomePapel?: string }[] = [];

  modalAberto = false;
  modoEdicao = false;
  colaboradorSelecionadoId: number | null = null;
  formColaborador: FormGroup;
  erros: { [key: string]: string } = {};
  mostrarSenha = false;
  mostrarConfirmarSenha = false;
  isLoading = false;
  modalTremendo = false;
  valoresOriginaisDoFormulario: any = null; 

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
    private colaboradorService: ColaboradorService,
    private papelService: PapelService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private ngZone: NgZone
  ) {
    this.formColaborador = this.fb.group({
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
    this.carregarColaboradors();

    // reavalia a confirmação de senha sempre que um dos dois campos mudar
    this.formColaborador.get('senha')?.valueChanges.subscribe(() => this.checarSenhasIguais());
    this.formColaborador.get('confirmarSenha')?.valueChanges.subscribe(() => this.checarSenhasIguais());
  }

  // senha: comparação e visibilidade

  private checarSenhasIguais(): void {
    const senha = this.formColaborador.get('senha');
    const confirmarSenha = this.formColaborador.get('confirmarSenha');
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

  carregarColaboradors(): void {
    this.colaboradorService.listarTodos().subscribe({
      next: (dados) => {
        this.colaboradores = dados;
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
    this.colaboradoresFiltrados = this.filtroPapel
      ? this.colaboradores.filter(m => m.nomePapel === this.filtroPapel)
      : this.colaboradores;
  }

  // controle do modal (cadastro e edição)
  abrirCadastro(): void {
    this.modoEdicao = false;
    this.colaboradorSelecionadoId = null;
    this.formColaborador.reset();
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;
    this.valoresOriginaisDoFormulario = null;

    this.formColaborador.get('senha')?.setValidators([
      Validators.required,
      Validators.pattern(this.senhaRegex),
      Validators.maxLength(50)
    ]);
    this.formColaborador.get('confirmarSenha')?.setValidators([Validators.required]);

    this.formColaborador.get('senha')?.updateValueAndValidity();
    this.formColaborador.get('confirmarSenha')?.updateValueAndValidity();
    this.modalAberto = true;
  }

  abrirEdicao(colaborador: Colaborador): void {
    this.modoEdicao = true;
    this.colaboradorSelecionadoId = colaborador.id;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;

    this.formColaborador.get('senha')?.clearValidators();
    this.formColaborador.get('confirmarSenha')?.clearValidators();
    this.formColaborador.get('senha')?.updateValueAndValidity();
    this.formColaborador.get('confirmarSenha')?.updateValueAndValidity();

    this.formColaborador.patchValue({
      ...colaborador,
      cpf: this.formatarCpf(colaborador.cpf),
      telefone: this.formatarTelefone(colaborador.telefone)
    });

    this.valoresOriginaisDoFormulario = this.formColaborador.getRawValue();

    this.modalAberto = true;
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao) return true; 
    return JSON.stringify(this.formColaborador.getRawValue()) !== JSON.stringify(this.valoresOriginaisDoFormulario);
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
          this.formColaborador.reset(); 
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

  // usado internamente após salvar com sucesso, sem pedir confirmação
  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
  }

  // proteção contra perda de dados

  formularioTemAlteracoesNaoSalvas(): boolean {
    if (!this.modalAberto) return false;
    return this.modoEdicao ? this.temAlteracoes : this.formColaborador.dirty;
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
    const controles = this.formColaborador.controls;
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

    this.formColaborador.get('cpf')?.setValue(valor, { emitEvent: false });
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

    this.formColaborador.get('telefone')?.setValue(valor, { emitEvent: false });
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
    this.formColaborador.markAllAsTouched();
    this.verificarErros();

    if (this.formColaborador.invalid) return;

    if (this.modoEdicao && !this.temAlteracoes) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoading = true;

    if (this.modoEdicao) {
      const { senha, confirmarSenha, ...dadosEdicao } = this.formColaborador.value;
      const dto: AtualizarColaboradorDTO = dadosEdicao;
      this.colaboradorService.atualizar(this.colaboradorSelecionadoId!, dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarColaboradors();
          this.toastr.success('Usuário atualizado com sucesso.', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao atualizar colaborador', 'Erro');
          setTimeout(() => this.cdr.detectChanges());
        }
      });
    } else {
      const { confirmarSenha, ...dadosCadastro } = this.formColaborador.value;
      const dto: CriarColaboradorDTO = dadosCadastro;
      this.colaboradorService.criar(dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarColaboradors();
          this.toastr.success('Usuário cadastrado com sucesso.', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao cadastrar colaborador', 'Erro');
          setTimeout(() => this.cdr.detectChanges());
        }
      });
    }
  }

  deletarColaborador(id: number): void {
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
        this.colaboradorService.deletar(id).subscribe({
          next: () => {
            this.carregarColaboradors();
            this.toastr.success('Usuário excluído com sucesso.', 'Sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir colaborador.', 'Erro')
        });
      }
    });
  }
}
