import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ToastrService } from 'ngx-toastr';

import { Perfil as PerfilModel } from 'src/app/shared/models/perfil.model';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import { formatarTelefone } from 'src/app/shared/utils/masks';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  perfil: PerfilModel | null = null;
  carregando = true;
  erroCarregar = false;

  modoEdicao = false;
  salvando = false;

  formDados: FormGroup;
  erros: { [key: string]: string } = {};

  private valoresOriginais: any = null;

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

  get nomesUnidades(): string {
    return this.perfil?.unidades?.map((u) => u.nome).join(', ') ?? '';
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
}
