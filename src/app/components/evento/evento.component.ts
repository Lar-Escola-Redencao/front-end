import { Component, OnInit, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventoService } from '../../services/evento.service';
import { ParceiroService } from '../../services/parceiro.service';
import { Evento, CriarEventoDTO, AtualizarEventoDTO, TipoEvento } from '../../models/evento.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ComponentComAlteracoesNaoSalvas } from '../../guards/can-deactivate.guard';
import { environment } from '../../environments/environment';

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
  tiposDisponiveis = Object.values(TipoEvento);
  parceiros: { id: number; nome: string }[] = [];

  modalAberto = false;
  modoEdicao = false;
  modalTremendo = false;
  eventoSelecionadoId: number | null = null;
  formEvento: FormGroup;
  erros: { [key: string]: string } = {};
  isLoading = false;
  imagemPreview: string | null = null;
  carregandoImagem = false;
  nomeArquivoSelecionado: string | null = null;
  imagemAlterada = false;
  valorNumerico: number | null = null;
  valoresOriginaisDoFormulario: any = null;

  modalVisualizacaoAberto = false;
  eventoVisualizacao: Evento | null = null;

  private readonly mensagensErro: { [campo: string]: { [tipoErro: string]: string | ((err: any) => string) } } = {
    titulo: { required: '⚠ Campo obrigatório.', minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`, maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.` },
    descricao: { required: '⚠ Campo obrigatório.', minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`, maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.` },
    dataEvento: { required: '⚠ Campo obrigatório.' },
    endereco: { required: '⚠ Campo obrigatório.', minlength: (e) => `⚠ Mínimo de ${e.requiredLength} caracteres.`, maxlength: (e) => `⚠ Máximo de ${e.requiredLength} caracteres.` },
    tipoEvento: { required: '⚠ Campo obrigatório.' },
    valor: { min: () => '⚠ Valor deve ser maior ou igual a 0.' },
    imagem: { required: '⚠ Imagem obrigatória no cadastro.' }
  };

  constructor(
    private eventoService: EventoService,
    private parceiroService: ParceiroService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.formEvento = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      descricao: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      dataEvento: ['', Validators.required],
      endereco: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
      tipoEvento: ['', Validators.required],
      valor: [null, [Validators.min(0)]],
      comentarioPosEvento: ['', Validators.maxLength(500)],
      parceirosIds: [[]],
      imagem: [null]
    });
  }

  ngOnInit(): void {
    this.carregarParceiros();
    this.carregarEventos();
  }

  // listagem e filtros

  carregarParceiros(): void {
    this.parceiroService.listarTodos().subscribe({
      next: (dados) => {
        this.parceiros = dados;

      },
       error: () => {
        this.toastr.error('Erro ao carregar lista de parceiros.', 'Erro');
      }
    });
  }

  carregarEventos(): void {
    this.eventoService.listarTodos().subscribe({
      next: (dados) => {
        this.eventos = dados || [];
        this.aplicarFiltro();

        setTimeout(() => {
          this.cdr.detectChanges();
        });
      },
     error: (err) => {
        console.error('Erro ao buscar eventos:', err);
        this.toastr.error('Não foi possível carregar a lista de eventos.', 'Erro');
      }
    });
  }

  aplicarFiltro(): void {
    if (!this.filtroTipo || this.filtroTipo === '') {
      this.eventosFiltrados = [...this.eventos];
    } else {
      this.eventosFiltrados = this.eventos.filter(e =>
        e.tipoEvento && String(e.tipoEvento).toUpperCase() === String(this.filtroTipo).toUpperCase()
      );
    }
  }

  // imagens

  tratarImagem(caminho: string | null | undefined): string {
    if (!caminho) return '';
    if (caminho.startsWith('http://') || caminho.startsWith('https://') || caminho.startsWith('data:')) {
      return caminho;
    }
    return `${environment.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }

  // controle do modal (cadastro e edição)

  abrirCadastro(): void {
    this.modoEdicao = false;
    this.eventoSelecionadoId = null;
    this.formEvento.reset({ parceirosIds: [] });
    this.erros = {};
    this.imagemPreview = null;
    this.nomeArquivoSelecionado = null;
    this.imagemAlterada = false;
    this.valorNumerico = null;
    this.isLoading = false;
    this.valoresOriginaisDoFormulario = null;
    this.formEvento.get('imagem')?.setValidators([Validators.required]);
    this.formEvento.get('imagem')?.updateValueAndValidity();
    this.modalAberto = true;
  }

  abrirEdicao(evento: Evento): void {
    this.modoEdicao = true;
    this.eventoSelecionadoId = evento.id;
    this.erros = {};
    this.imagemPreview = this.tratarImagem(evento.imagem);
    this.nomeArquivoSelecionado = null;
    this.imagemAlterada = false;
    this.valorNumerico = evento.valor ?? null;
    this.isLoading = false;
    this.formEvento.get('imagem')?.clearValidators();
    this.formEvento.get('imagem')?.updateValueAndValidity();

    this.formEvento.patchValue({
      titulo: evento.titulo,
      descricao: evento.descricao,
      dataEvento: this.formatarDataParaInput(evento.dataEvento),
      endereco: evento.endereco,
      tipoEvento: evento.tipoEvento,
      valor: evento.valor ? this.formatarMoeda(evento.valor) : '',
      comentarioPosEvento: evento.comentarioPosEvento,
      parceirosIds: evento.parceiros ? evento.parceiros.map(p => p.id) : []
    });

    this.valoresOriginaisDoFormulario = this.formEvento.getRawValue();
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

  get temAlteracoes(): boolean {
    if (!this.modoEdicao) return this.formEvento.dirty;
    return JSON.stringify(this.formEvento.getRawValue()) !== JSON.stringify(this.valoresOriginaisDoFormulario);
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.modalAberto && this.temAlteracoes;
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
          this.formEvento.reset();
        } else {
          this.dispararTremorModal();
        }
        this.cdr.detectChanges();
      });
    });
  }

  /** Usado internamente após salvar com sucesso, sem pedir confirmação. */
  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
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
      this.formEvento.get('imagem')?.markAsDirty();
      this.nomeArquivoSelecionado = arquivo.name;
      this.imagemAlterada = true;
      this.carregandoImagem = true;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagemPreview = e.target.result;
        this.carregandoImagem = false;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(arquivo);
    }
  }

  onPreviewImagemCarregada(): void {
    this.carregandoImagem = false;
  }

  onPreviewImagemErro(): void {
    this.carregandoImagem = false;
  }

  aplicarMascaraValor(event: any): void {
    let digitos = String(event.target.value).replace(/\D/g, '');

    if (!digitos) {
      this.valorNumerico = null;
      this.formEvento.get('valor')?.setValue('', { emitEvent: false });
      return;
    }

    const numero = Number(digitos) / 100;
    this.valorNumerico = numero;
    this.formEvento.get('valor')?.setValue(this.formatarMoeda(numero), { emitEvent: false });
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  formatarDataParaInput(data: Date | string): string {
    if (!data) return '';
    const d = new Date(data);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // interações com backend

  salvar(): void {
    this.formEvento.markAllAsTouched();
    this.verificarErros();
    if (this.formEvento.invalid) return;

    if (this.modoEdicao && !this.temAlteracoes) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.isLoading = true;
    const formValues = this.formEvento.value;

    if (this.modoEdicao) {
      const dto: AtualizarEventoDTO = {
        ...formValues,
        valor: this.valorNumerico ?? undefined,
        imagem: formValues.imagem instanceof File ? formValues.imagem : undefined
      };

      this.eventoService.atualizar(this.eventoSelecionadoId!, dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarEventos();
          this.toastr.success('Evento atualizado com sucesso!', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao atualizar evento.', 'Erro');
          setTimeout(() => this.cdr.detectChanges());
        }
      });
    } else {
      const dto: CriarEventoDTO = { ...formValues, valor: this.valorNumerico ?? undefined };
      this.eventoService.criar(dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarEventos();
          this.toastr.success('Evento criado com sucesso!', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao criar evento.', 'Erro');
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
      this.ngZone.run(() => {
        if (resultado.isConfirmed) {
          this.eventoService.deletar(id).subscribe({
            next: () => {
              this.carregarEventos();
              this.toastr.success('Evento excluído com sucesso!', 'Sucesso');
            },
            error: () => {
              this.toastr.error('Erro ao excluir evento.', 'Erro');
            }
          });
        }
      });
    });
  }

  isParceiroSelecionado(id: number): boolean {
    const selecionados: number[] = this.formEvento.get('parceirosIds')?.value || [];
    return selecionados.includes(id);
  }

  onParceiroToggle(id: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const selecionados: number[] = [...(this.formEvento.get('parceirosIds')?.value || [])];

    if (checkbox.checked) {
      if (!selecionados.includes(id)) {
        selecionados.push(id);
      }
    } else {
      const index = selecionados.indexOf(id);
      if (index !== -1) {
        selecionados.splice(index, 1);
      }
    }

    this.formEvento.patchValue({ parceirosIds: selecionados });
    this.formEvento.get('parceirosIds')?.markAsDirty();
  }
}
