import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { AlterarSenha } from '../alterar-senha/alterar-senha';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ToastrService } from 'ngx-toastr';

import { Perfil as PerfilModel } from 'src/app/shared/models/perfil.model';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import { formatarCpf, formatarTelefone } from 'src/app/shared/utils/masks';
import { Auth } from 'src/app/shared/services/auth/auth';
import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { Alertas } from 'src/app/shared/utils/alerts';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    AlterarSenha,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit, ComponentComAlteracoesNaoSalvas {
  @ViewChild(AlterarSenha) private alterarSenha?: AlterarSenha;
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  perfil: PerfilModel | null = null;
  carregando = true;
  erroCarregar = false;

  modalSenhaAberto = false;
  modoEdicao = false;
  salvando = false;
  modoEdicaoConta = false;
  salvandoConta = false;

  formDados: FormGroup;
  formConta: FormGroup;
  erros: { [key: string]: string } = {};
  errosConta: { [key: string]: string } = {};
  private valoresOriginaisConta: { email: string; cpf: string } | null = null;

  private valoresOriginais: any = null;
  private readonly nomesPapel: Record<string, string> = {
    ADMINISTRADOR: 'Administrador',
    COLABORADOR: 'Colaborador'
  };

  constructor(
    private perfilService: PerfilService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.formDados = this.fb.group({
      nomeCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      endereco: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
      telefone: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(15)]]
    });

    this.formDados.disable();
    this.formConta = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.minLength(5), Validators.maxLength(100)]],
      cpf: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(14)]]
    });
    this.formConta.disable();
  }

  ngOnInit(): void {
    this.carregarPerfil();
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return !!this.alterarSenha?.formularioTemAlteracoesNaoSalvas() || this.dadosTemAlteracoesNaoSalvas();
  }

  confirmarDescarte(): Promise<boolean> {
    if (this.alterarSenha?.formularioTemAlteracoesNaoSalvas()) {
      return this.alterarSenha.confirmarDesistencia(this.dadosTemAlteracoesNaoSalvas()
        ? 'Deseja desistir de alterar a senha e descartar as alterações não salvas do perfil?'
        : undefined);
    }
    return Alertas.confirmarDescarte();
  }

  private dadosTemAlteracoesNaoSalvas(): boolean {
    return this.temAlteracoes || this.temAlteracoesConta;
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao || !this.valoresOriginais) {
      return false;
    }

    const valores = this.formDados.getRawValue();
    return Object.keys(this.valoresOriginais).some(
      campo => valores[campo] !== this.valoresOriginais[campo]
    );
  }

  get podeEditarConta(): boolean {
    return this.perfil?.nomePapel === 'ADMINISTRADOR';
  }

  get temAlteracoesConta(): boolean {
    if (!this.modoEdicaoConta || !this.valoresOriginaisConta) return false;
    const valores = this.formConta.getRawValue();
    return String(valores.email ?? '').trim().toLowerCase() !== this.valoresOriginaisConta.email.toLowerCase()
      || String(valores.cpf ?? '').replace(/\D/g, '') !== this.valoresOriginaisConta.cpf;
  }

  private preencherFormularios(perfil: PerfilModel): void {
    this.perfil = perfil;
    this.valoresOriginais = {
      nomeCompleto: perfil.nomeCompleto, endereco: perfil.endereco, telefone: formatarTelefone(perfil.telefone)
    };
    this.valoresOriginaisConta = { email: String(perfil.email ?? '').trim(), cpf: String(perfil.cpf ?? '').replace(/\D/g, '') };
    this.formDados.reset(this.valoresOriginais);
    this.formDados.disable();
    this.formConta.reset({ email: perfil.email, cpf: formatarCpf(perfil.cpf) });
    this.formConta.disable();
    this.modoEdicao = false;
    this.modoEdicaoConta = false;
    this.erros = {};
    this.errosConta = {};
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  get nomesUnidades(): string {
    return this.perfil?.unidades?.map((u) => u.nome).join(', ') ?? '';
  }

  get cpfFormatado(): string {
    return formatarCpf(this.perfil?.cpf) || '-';
  }

  get nomePapelFormatado(): string {
    return this.formatarTextoExibicao(this.perfil?.nomePapel);
  }

  carregarPerfil(): void {
    this.carregando = true;
    this.erroCarregar = false;

    this.perfilService.buscarMeuPerfil().subscribe({
      next: (perfil) => {
        this.ngZone.run(() => {
          this.preencherFormularios(perfil);
          this.carregando = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.erroCarregar = true;
          this.carregando = false;
          this.toastr.error('Não foi possível carregar seu perfil.');
          this.cdr.detectChanges();
        });
      }
    });
  }

  habilitarEdicao(): void {
    if (this.modoEdicaoConta || this.salvandoConta) return;
    this.modoEdicao = true;
    this.erros = {};
    this.formDados.enable();
  }

  cancelarEdicao(): void {
    this.modoEdicao = false;
    this.erros = {};
    this.formDados.reset(this.valoresOriginais);
    this.formDados.disable();
  }

  aplicarMascaraTelefone(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = formatarTelefone(input.value);
    this.formDados.get('telefone')?.setValue(input.value, { emitEvent: false });
  }

  verificarErros(): void {
    this.erros = mapearErrosFormulario(this.formDados);
  }

  habilitarEdicaoConta(): void {
    if (!this.podeEditarConta || this.modoEdicao || this.salvando || this.salvandoConta) return;
    this.modoEdicaoConta = true;
    this.errosConta = {};
    this.formConta.enable();
  }

  cancelarEdicaoConta(): void {
    if (this.salvandoConta) return;
    this.modoEdicaoConta = false;
    this.errosConta = {};
    this.formConta.reset({ email: this.valoresOriginaisConta?.email ?? '', cpf: formatarCpf(this.valoresOriginaisConta?.cpf ?? '') });
    this.formConta.disable();
  }

  aplicarMascaraCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = formatarCpf(input.value);
    this.formConta.get('cpf')?.setValue(input.value, { emitEvent: false });
  }

  verificarErrosConta(): void {
    this.errosConta = mapearErrosFormulario(this.formConta);
  }

  async salvarConta(): Promise<void> {
    if (!this.perfil || !this.podeEditarConta || !this.modoEdicaoConta || this.salvandoConta || !this.temAlteracoesConta) return;
    this.formConta.markAllAsTouched();
    this.verificarErrosConta();
    if (this.formConta.invalid) return;
    const valores = this.formConta.getRawValue();
    const dto = {
      nomeCompleto: this.perfil.nomeCompleto,
      endereco: this.perfil.endereco,
      telefone: String(this.perfil.telefone ?? '').replace(/\D/g, ''),
      email: String(valores.email).trim(),
      cpf: String(valores.cpf).replace(/\D/g, '')
    };
    this.salvandoConta = true;
    try {
      if (!await Alertas.confirmarAlteracaoIdentificadores()) {
        this.salvandoConta = false;
        this.cdr.markForCheck();
        return;
      }
    } catch {
      this.salvandoConta = false;
      this.cdr.markForCheck();
      return;
    }
    this.formConta.disable();
    this.perfilService.atualizar(dto).subscribe({
      next: perfil => this.ngZone.run(() => {
        this.preencherFormularios(perfil);
        this.salvandoConta = false;
        this.toastr.success('Dados de acesso atualizados. Entre novamente com os dados atualizados.');
        this.auth.logout();
        void this.router.navigate(['/entrar']);
        this.cdr.markForCheck();
      }),
      error: erro => this.ngZone.run(() => {
        this.salvandoConta = false;
        this.formConta.enable();
        this.toastr.error(erro?.error?.message ?? 'Não foi possível atualizar os dados da conta.');
        this.cdr.markForCheck();
      })
    });
  }

  salvar(): void {
    if (this.salvando || !this.temAlteracoes) return;
    this.formDados.markAllAsTouched();
    this.verificarErros();

    if (this.formDados.invalid) {
      this.toastr.error('Confira os campos destacados antes de salvar.');
      return;
    }

    this.salvando = true;
    const valores = this.formDados.getRawValue();

    this.perfilService
      .atualizar({
        nomeCompleto: valores.nomeCompleto,
        endereco: valores.endereco,
        telefone: (valores.telefone as string)?.replace(/\D/g, '') ?? ''
      })
      .subscribe({
        next: (perfilAtualizado) => {
          this.ngZone.run(() => {
            this.preencherFormularios(perfilAtualizado);
            this.salvando = false;
            this.toastr.success('Dados do perfil atualizados com sucesso!');
            this.cdr.detectChanges();
          });
        },
        error: (erro) => {
          this.ngZone.run(() => {
            this.salvando = false;
            const mensagem = erro?.error?.message ?? 'Não foi possível atualizar seu perfil.';
            this.toastr.error(mensagem);
            this.cdr.detectChanges();
          });
        }
      });
  }

  private formatarTextoExibicao(valor: string | null | undefined): string {
    if (!valor) {
      return '';
    }

    const textoMapeado = this.nomesPapel[valor];

    if (textoMapeado) {
      return textoMapeado;
    }

    return valor
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letra) => letra.toUpperCase());
  }
}
