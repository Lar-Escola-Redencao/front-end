import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventoService } from '../../services/evento.service';
import { ParceiroService } from '../../services/parceiro.service';
import { Evento, CriarEventoDTO, AtualizarEventoDTO, TipoEvento } from '../../models/evento.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ComponentComAlteracoesNaoSalvas } from '../../guards/can-deactivate.guard';

@Component({
  selector: 'app-evento',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './evento.component.html',
  styleUrls: ['./evento.component.css']
})
export class EventoComponent implements OnInit, ComponentComAlteracoesNaoSalvas {

  eventos: Evento[] = [];
  eventosFiltrados: Evento[] = [];
  filtroTipo = '';
  tiposDisponiveis: TipoEvento[] = [];
  parceiros: { id: number; nome: string }[] = [];

  modalAberto = false;
  modoEdicao = false;
  eventoSelecionadoId: number | null = null;
  formEvento: FormGroup;
  erros: { [key: string]: string } = {};
  isLoading = false;
  imagemPreview: string | null = null;

  modalVisualizacaoAberto = false;
  eventoVisualizacao: Evento | null = null;

  private readonly mensagensErro: { [campo: string]: { [tipoErro: string]: string | ((err: any) => string) } } = {
    titulo: { required: '⚠ Campo obrigatório.', minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`, maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.` },
    descricao: { required: '⚠ Campo obrigatório.', minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`, maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.` },
    dataEvento: { required: '⚠ Campo obrigatório.' },
    endereco: { required: '⚠ Campo obrigatório.', minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`, maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.` },
    tipoEvento: { required: '⚠ Campo obrigatório.' },
    valor: { min: () => '⚠ Valor deve ser maior que 0.', pattern: () => '⚠ Informe um valor válido.' },
    imagem: { required: '⚠ Imagem obrigatória no cadastro.' }
  };

  constructor(
    private eventoService: EventoService,
    private parceiroService: ParceiroService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {
    this.formEvento = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      descricao: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      dataEvento: ['', Validators.required],
      endereco: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
      tipoEvento: ['', Validators.required],
      valor: [null],
      comentarioPosEvento: ['', Validators.maxLength(500)],
      parceirosIds: [[]],
      imagem: [null]
    });
  }

  ngOnInit(): void {
    this.carregarParceiros();
    this.carregarEventos();
  }

  carregarParceiros(): void {
    this.parceiroService.listarTodos().subscribe({
      next: (dados) => this.parceiros = dados,
      error: (err) => console.error('Erro ao carregar parceiros:', err)
    });
  }

  carregarEventos(): void {
    this.eventoService.listarTodos().subscribe({
      next: (dados) => {
        this.eventos = dados;
        this.tiposDisponiveis = [...new Set(dados.map(e => e.tipoEvento))];
        this.aplicarFiltro();
        setTimeout(() => this.cdr.detectChanges());
      },
      error: (err) => this.toastr.error('Não foi possível carregar a lista de eventos.', 'Erro')
    });
  }

  aplicarFiltro(): void {
    this.eventosFiltrados = this.filtroTipo ? this.eventos.filter(e => e.tipoEvento === this.filtroTipo) : this.eventos;
  }

  abrirCadastro(): void {
    this.modoEdicao = false;
    this.eventoSelecionadoId = null;
    this.formEvento.reset();
    this.erros = {};
    this.imagemPreview = null;
    this.isLoading = false;
    this.formEvento.get('imagem')?.setValidators([Validators.required]);
    this.formEvento.get('imagem')?.updateValueAndValidity();
    this.modalAberto = true;
  }

  abrirVisualizacao(evento: Evento): void {
    this.eventoVisualizacao = evento;
    this.modalVisualizacaoAberto = true;
  }

  fecharVisualizacao(): void {
    this.modalVisualizacaoAberto = false;
    this.eventoVisualizacao = null;
  }

  abrirEdicao(evento: Evento): void {
    this.modoEdicao = true;
    this.eventoSelecionadoId = evento.id;
    this.erros = {};
    this.imagemPreview = evento.imagem;
    this.isLoading = false;
    this.formEvento.get('imagem')?.clearValidators();
    this.formEvento.get('imagem')?.updateValueAndValidity();
    this.formEvento.patchValue({
      titulo: evento.titulo,
      descricao: evento.descricao,
      dataEvento: this.formatarDataParaInput(evento.dataEvento),
      endereco: evento.endereco,
      tipoEvento: evento.tipoEvento,
      valor: evento.valor,
      comentarioPosEvento: evento.comentarioPosEvento,
      parceirosIds: evento.parceiros.map(p => p.id)
    });
    this.modalAberto = true;
  }

  fecharModal(): void { this.modalAberto = false; }

  formularioTemAlteracoesNaoSalvas(): boolean { return this.modalAberto && this.formEvento.dirty; }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  verificarErros(): void {
    const controles = this.formEvento.controls;
    this.erros = {};
    for (const campo in controles) {
      const controle = controles[campo];
      if (controle.invalid && (controle.dirty || controle.touched)) {
        const mensagensCampo = this.mensagensErro[campo] || {};
        for (const tipoErro in controle.errors) {
          const mensagem = mensagensCampo[tipoErro];
          if (mensagem) {
            this.erros[campo] = typeof mensagem === 'function' ? mensagem(controle.getError(tipoErro)) : mensagem;
            break;
          }
        }
      }
    }
  }

  onImagemSelecionada(event: any): void {
    const arquivo = event.target.files[0];
    if (arquivo) {
      this.formEvento.patchValue({ imagem: arquivo });
      const reader = new FileReader();
      reader.onload = (e: any) => this.imagemPreview = e.target.result;
      reader.readAsDataURL(arquivo);
    }
  }

  formatarDataParaInput(data: Date): string {
    if (!data) return '';
    const d = new Date(data);
    return d.toISOString().slice(0, 16);
  }

  salvar(): void {
    this.formEvento.markAllAsTouched();
    this.verificarErros();
    if (this.formEvento.invalid) return;
    this.isLoading = true;

    if (this.modoEdicao) {
      const dto: AtualizarEventoDTO = { ...this.formEvento.value, imagem: this.formEvento.get('imagem')?.value || null };
      this.eventoService.atualizar(this.eventoSelecionadoId!, dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModal();
          this.carregarEventos();
          this.toastr.success('Evento atualizado com sucesso.', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao atualizar evento', 'Erro');
          setTimeout(() => this.cdr.detectChanges());
        }
      });
    } else {
      const dto: CriarEventoDTO = this.formEvento.value;
      this.eventoService.criar(dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModal();
          this.carregarEventos();
          this.toastr.success('Evento criado com sucesso.', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao criar evento', 'Erro');
          setTimeout(() => this.cdr.detectChanges());
        }
      });
    }
  }

  deletarEvento(id: number): void {
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
        this.eventoService.deletar(id).subscribe({
          next: () => {
            this.carregarEventos();
            this.toastr.success('Evento excluído com sucesso.', 'Sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir evento.', 'Erro')
        });
      }
    });
  }
}
