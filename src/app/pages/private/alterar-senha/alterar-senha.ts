import { Component, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ModalLayout } from '../../../components/modal-layout/modal-layout';
import { PerfilService } from '../../../shared/services/colaborador/perfil.service';
import { Auth } from '../../../shared/services/auth/auth';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-alterar-senha',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    A11yModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ModalLayout
  ],
  templateUrl: './alterar-senha.html',
  styleUrl: './alterar-senha.css'
})
export class AlterarSenha {
  @Output() closed = new EventEmitter<void>();
  private readonly perfilService = inject(PerfilService);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  etapa = signal<1 | 2 | 3>(1);
  carregando = signal(false);
  erro = signal('');
  mostrarAtual = signal(false);
  mostrarNova = signal(false);
  mostrarConfirmacao = signal(false);
  confirmandoDesistencia = signal(false);
  private confirmacaoDesistencia?: Promise<boolean>;

  formAtual = new FormGroup({
    senhaAtual: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  formSenha = new FormGroup(
    {
      novaSenha: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{6,}$/)]
      }),
      confirmacaoSenha: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      })
    },
    {
      validators: (grupo) =>
        !grupo.get('novaSenha')?.value || !grupo.get('confirmacaoSenha')?.value
          ? null
          : grupo.get('novaSenha')?.value === grupo.get('confirmacaoSenha')?.value
            ? null
            : { senhasDiferentes: true }
    }
  );

  constructor() {
    this.formSenha.controls.novaSenha.valueChanges.subscribe(() => this.validarSenhasIguais());
    this.formSenha.controls.confirmacaoSenha.valueChanges.subscribe(() => this.validarSenhasIguais());
  }

  @HostListener('document:keydown.escape')
  async fechar(): Promise<void> {
    if (this.carregando() || this.confirmandoDesistencia()) {
      return;
    }
    if (!await this.confirmarDesistencia()) {
      return;
    }
    this.formAtual.reset();
    this.formSenha.reset();
    this.closed.emit();
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.etapa() !== 3 && (this.etapa() === 2 || this.carregando()
      || !!this.formAtual.getRawValue().senhaAtual
      || !!this.formSenha.getRawValue().novaSenha
      || !!this.formSenha.getRawValue().confirmacaoSenha);
  }

  confirmarDesistencia(mensagem = 'Deseja realmente desistir de alterar sua senha? Os dados preenchidos serão descartados.'): Promise<boolean> {
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      return Promise.resolve(true);
    }
    if (this.carregando()) {
      return Promise.resolve(false);
    }
    if (this.confirmacaoDesistencia) {
      return this.confirmacaoDesistencia;
    }
    this.confirmandoDesistencia.set(true);
    this.confirmacaoDesistencia = Swal.fire({
      title: 'Desistir de alterar a senha?',
      text: mensagem,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, desistir',
      cancelButtonText: 'Continuar alterando',
      confirmButtonColor: '#e04b3a',
      reverseButtons: false
    }).then(resultado => resultado.isConfirmed).finally(() => {
      this.confirmandoDesistencia.set(false);
      this.confirmacaoDesistencia = undefined;
    });
    return this.confirmacaoDesistencia;
  }

  confirmarSenhaAtual(): void {
    this.formAtual.markAllAsTouched();
    if (this.formAtual.invalid || this.carregando()) {
      return;
    }
    this.erro.set('');
    this.carregando.set(true);
    this.formAtual.disable();
    this.perfilService.validarSenhaAtual(this.formAtual.getRawValue().senhaAtual).subscribe({
      next: () => {
        this.carregando.set(false);
        this.mostrarAtual.set(false);
        this.etapa.set(2);
      },
      error: (erro) => {
        this.carregando.set(false);
        this.formAtual.enable();
        if (erro?.error?.message === 'A senha atual está incorreta.') {
          this.formAtual.controls.senhaAtual.setErrors({ senhaIncorreta: true });
          this.erro.set('');
        } else {
          this.erro.set(erro?.error?.message || 'Não foi possível confirmar sua senha atual.');
        }
      }
    });
  }

  async irParaRecuperacaoSenha(): Promise<void> {
    if (!await this.confirmarDesistencia('Os dados preenchidos serão descartados para recuperar sua senha.')) {
      return;
    }
    this.auth.logout();
    void this.router.navigate(['/recuperar-senha']);
  }

  async voltarParaConfirmacao(): Promise<void> {
    if (this.carregando() || this.confirmandoDesistencia()) {
      return;
    }
    if (!await this.confirmarDesistencia()) {
      return;
    }
    this.reiniciarConfirmacao();
  }

  private reiniciarConfirmacao(): void {
    this.formAtual.enable();
    this.formAtual.reset();
    this.formSenha.reset();
    this.erro.set('');
    this.etapa.set(1);
  }

  salvarSenha(): void {
    this.formSenha.markAllAsTouched();
    this.validarSenhasIguais();
    if (this.etapa() !== 2 || this.formSenha.invalid || this.carregando()) {
      return;
    }
    this.erro.set('');
    this.carregando.set(true);
    const dto = {
      senhaAtual: this.formAtual.getRawValue().senhaAtual,
      ...this.formSenha.getRawValue()
    };
    this.formSenha.disable();
    this.perfilService.alterarSenha(dto).subscribe({
      next: () => {
        this.carregando.set(false);
        this.formAtual.reset();
        this.formSenha.reset();
        this.mostrarNova.set(false);
        this.mostrarConfirmacao.set(false);
        this.etapa.set(3);
      },
      error: (erro) => {
        this.carregando.set(false);
        this.formSenha.enable();
        this.reiniciarConfirmacao();
        this.erro.set(erro?.error?.message || 'Não foi possível alterar sua senha.');
      }
    });
  }

  private validarSenhasIguais(): void {
    const novaSenha = this.formSenha.controls.novaSenha;
    const confirmacaoSenha = this.formSenha.controls.confirmacaoSenha;
    const erros = { ...(confirmacaoSenha.errors || {}) };

    delete erros['senhasDiferentes'];
    if (novaSenha.value && confirmacaoSenha.value && novaSenha.value !== confirmacaoSenha.value) {
      erros['senhasDiferentes'] = true;
    }

    confirmacaoSenha.setErrors(Object.keys(erros).length ? erros : null);
  }
}
