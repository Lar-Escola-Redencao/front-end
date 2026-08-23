import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MembroService } from '../../services/membro.service';
import { PapelService } from '../../services/papel.service';
import { Membro, CriarMembroDTO, AtualizarMembroDTO } from '../../models/membro.model';

@Component({
  selector: 'app-membro',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './membro.component.html',
  styleUrls: ['./membro.component.css']
})
export class MembroComponent implements OnInit {

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

  constructor(
    private membroService: MembroService,
    private papelService: PapelService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.formMembro = this.fb.group({
      nomeCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email, Validators.minLength(5), Validators.maxLength(100)]],
      senha: [''],
      cpf: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(14)]],
      endereco: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
      telefone: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(15)]],
      idPapel: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarPapeis();
    this.carregarMembros();
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
        alert('Erro ao carregar membros');
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
    this.formMembro.get('senha')?.setValidators([
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(50)
    ]);
    this.formMembro.get('senha')?.updateValueAndValidity();
    this.modalAberto = true;
  }

  abrirEdicao(membro: Membro): void {
    this.modoEdicao = true;
    this.membroSelecionadoId = membro.id;
    this.erros = {};
    this.formMembro.get('senha')?.clearValidators();
    this.formMembro.get('senha')?.updateValueAndValidity();
    this.formMembro.patchValue(membro);
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
  }

  // validações e máscaras
  verificarErros(): void {
    const controles = this.formMembro.controls;
    this.erros = {};

    for (const campo in controles) {
      const controle = controles[campo];
      if (controle.invalid && (controle.dirty || controle.touched)) {
        if (controle.hasError('required')) {
          this.erros[campo] = '⚠ Campo obrigatório.';
        } else if (controle.hasError('email')) {
          this.erros[campo] = '⚠ Digite um e-mail válido.';
        } else if (controle.hasError('minlength')) {
          const min = controle.getError('minlength').requiredLength;
          if (campo === 'cpf') this.erros[campo] = '⚠ CPF incompleto.';
          else if (campo === 'telefone') this.erros[campo] = '⚠ Telefone incompleto.';
          else if (campo === 'senha') this.erros[campo] = `⚠ A senha deve ter no mínimo ${min} caracteres.`;
          else this.erros[campo] = `⚠ Mínimo de ${min} caracteres.`;
        } else if (controle.hasError('maxlength')) {
          const max = controle.getError('maxlength').requiredLength;
          this.erros[campo] = `⚠ Máximo de ${max} caracteres.`;
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

  // interações com backend
  salvar(): void {
    this.formMembro.markAllAsTouched();
    this.verificarErros();

    if (this.formMembro.invalid) return;

    if (this.modoEdicao) {
      const { senha, ...dadosEdicao } = this.formMembro.value;
      const dto: AtualizarMembroDTO = dadosEdicao;
      this.membroService.atualizar(this.membroSelecionadoId!, dto).subscribe({
        next: () => { this.fecharModal(); this.carregarMembros(); },
        error: (err) => alert(err.error?.message || 'Erro ao atualizar membro')
      });
    } else {
      const dto: CriarMembroDTO = this.formMembro.value;
      this.membroService.criar(dto).subscribe({
        next: () => { this.fecharModal(); this.carregarMembros(); },
        error: (err) => alert(err.error?.message || 'Erro ao cadastrar membro')
      });
    }
  }

  deletarMembro(id: number): void {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      this.membroService.deletar(id).subscribe({
        next: () => this.carregarMembros(),
        error: () => alert('Erro ao excluir membro')
      });
    }
  }
}
