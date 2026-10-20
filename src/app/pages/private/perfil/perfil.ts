import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { AlterarSenha } from '../alterar-senha/alterar-senha';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ToastrService } from 'ngx-toastr';

import { Perfil as PerfilModel } from 'src/app/shared/models/perfil.model';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import { formatarTelefone } from 'src/app/shared/utils/masks';
import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { Alertas } from 'src/app/shared/utils/alerts';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
  perfil: PerfilModel | null = null;
  carregando = true;
  erroCarregar = false;

  modalSenhaAberto = false;
  modoEdicao = false;
  salvando = false;

  formDados: FormGroup;
  erros: { [key: string]: string } = {};

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
    if (!this.modoEdicao || !this.valoresOriginais) {
      return false;
    }

    const valores = this.formDados.getRawValue();
    return Object.keys(this.valoresOriginais).some(
      campo => valores[campo] !== this.valoresOriginais[campo]
    );
  }

  get temAlteracoes(): boolean {
    return this.dadosTemAlteracoesNaoSalvas();
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

  get nomePapelFormatado(): string {
    return this.formatarTextoExibicao(this.perfil?.nomePapel);
  }

  carregarPerfil(): void {
    this.carregando = true;
    this.erroCarregar = false;

    this.perfilService.buscarMeuPerfil().subscribe({
      next: (perfil) => {
        this.ngZone.run(() => {
          this.perfil = perfil;
          this.valoresOriginais = {
            nomeCompleto: perfil.nomeCompleto,
            endereco: perfil.endereco,
            telefone: formatarTelefone(perfil.telefone)
          };
          this.formDados.reset(this.valoresOriginais);
          this.formDados.disable();
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
            this.perfil = perfilAtualizado;
            this.valoresOriginais = {
              nomeCompleto: perfilAtualizado.nomeCompleto,
              endereco: perfilAtualizado.endereco,
              telefone: formatarTelefone(perfilAtualizado.telefone)
            };
            this.formDados.reset(this.valoresOriginais);
            this.formDados.disable();
            this.modoEdicao = false;
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
