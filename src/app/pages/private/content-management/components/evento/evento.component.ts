import { Component, OnInit, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';
import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { AtualizarEventoDTO, CriarEventoDTO, Evento, TipoEvento } from 'src/app/shared/models/evento.model';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario, validarImagem } from 'src/app/shared/utils/form-validations';
import { EventoService } from 'src/app/shared/services/content-management/evento/evento.service';
import { ParceiroService } from 'src/app/shared/services/content-management/evento/parceiro.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-evento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    MatFormFieldModule,
    MatInputModule,
    MatSelect,
    MatOption
  ],
  templateUrl: './evento.component.html',
  styleUrls: ['./evento.component.css']
})
export class EventoComponent implements OnInit, ComponentComAlteracoesNaoSalvas {
  readonly TipoEvento = TipoEvento;

  eventos: Evento[] = [];
  eventosFiltrados: Evento[] = [];
  filtroTipo = '';
  tiposDisponiveis = Object.values(TipoEvento);
  parceiros: { id: number; nome: string; logo?: string }[] = [];

  modalAberto = false;
  modoEdicao = false;
  modalTremendo = false;
  eventoSelecionadoId: number | null = null;
  formEvento: FormGroup;
  erros: { [key: string]: string } = {};
  isLoading = false;
  imagemPreview: string | null = null;
  nomeArquivoSelecionado = '';
  imagemSelecionada: File | null = null;
  valorNumerico: number | null = null;
  valoresOriginaisDoFormulario: any = null;

  modalVisualizacaoAberto = false;
  eventoVisualizacao: Evento | null = null;

  colunas: TabelaColuna<Evento>[] = [
    { chave: 'titulo', titulo: 'Titulo', principalMobile: true },
    {
      chave: 'dataEvento',
      titulo: 'Data',
      formatar: (valor) => this.formatarDataTabela(valor)
    },
    { chave: 'tipoEvento', titulo: 'Tipo' },
    {
      chave: 'valor',
      titulo: 'Valor',
      formatar: (valor) => valor ? this.formatarMoeda(valor) : 'Gratuito'
    }
  ];

  acoesTabela: TabelaAcao<Evento>[] = [
    { icone: 'visibility', tooltip: 'Visualizar', acao: 'visualizar' },
    { icone: 'edit', tooltip: 'Editar', acao: 'editar' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir' }
  ];

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
      valor: ['', [Validators.min(0)]],
      parceirosIds: [[]],
      imagem: [null, [Validators.required, validarImagem()]]
    });
  }

  ngOnInit(): void {
    this.carregarParceiros();
    this.carregarEventos();
  }

  get mensagemVazia(): string {
    return this.filtroTipo
      ? `Nenhum evento do tipo ${this.filtroTipo} cadastrado ainda`
      : 'Nenhum evento cadastrado ainda';
  }

  carregarParceiros(): void {
    this.parceiroService.listarTodos().subscribe({
      next: (dados) => {
        this.parceiros = dados;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Erro ao carregar lista de parceiros.', 'Erro');
      }
    });
  }

  carregarEventos(): void {
    this.eventoService.listarTodos().subscribe({
      next: (dados) => {
        this.ngZone.run(() => {
          this.eventos = [...(dados || [])];

          this.eventosFiltrados = this.filtroTipo
            ? this.eventos.filter(e =>
                e.tipoEvento &&
                String(e.tipoEvento).toUpperCase() ===
                String(this.filtroTipo).toUpperCase()
              )
            : [...this.eventos];

          this.cdr.detectChanges();
        });
      },

      error: () => {
        this.ngZone.run(() => {
          this.toastr.error(
            'Nao foi possivel carregar a lista de eventos.',
            'Erro'
          );

          this.cdr.detectChanges();
        });
      }
    });
  }

  aplicarFiltro(): void {
    this.eventosFiltrados = this.filtroTipo
      ? this.eventos.filter(e =>
          e.tipoEvento &&
          String(e.tipoEvento).toUpperCase() === String(this.filtroTipo).toUpperCase()
        )
      : [...this.eventos];
  }

  tratarImagem(caminho: string | null | undefined): string {
    if (!caminho) return '';
    if (
      caminho.startsWith('http://') ||
      caminho.startsWith('https://') ||
      caminho.startsWith('data:')
    ) {
      return caminho;
    }

    return `${environment.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }

  abrirCadastro(): void {
    this.modoEdicao = false;
    this.eventoSelecionadoId = null;
    this.prepararEstadoFormulario();
    this.formEvento.get('imagem')?.setValidators([Validators.required, validarImagem()]);
    this.formEvento.get('imagem')?.updateValueAndValidity();
    this.formEvento.reset({ valor: '', parceirosIds: [], imagem: null });
    this.formEvento.markAsPristine();
    this.formEvento.markAsUntouched();
    this.valoresOriginaisDoFormulario = this.obterValorComparavelFormulario();
    this.modalAberto = true;
  }

  abrirEdicao(evento: Evento): void {
    this.modoEdicao = true;
    this.eventoSelecionadoId = evento.id;
    this.prepararEstadoFormulario();
    this.imagemPreview = this.tratarImagem(evento.imagem);
    this.valorNumerico = evento.valor ?? null;
    this.formEvento.get('imagem')?.setValidators([validarImagem()]);
    this.formEvento.get('imagem')?.updateValueAndValidity();

    this.formEvento.reset({
      titulo: evento.titulo,
      descricao: evento.descricao,
      dataEvento: this.formatarDataParaInput(evento.dataEvento),
      endereco: evento.endereco,
      tipoEvento: evento.tipoEvento,
      valor: evento.valor ? this.formatarMoeda(evento.valor) : '',
      parceirosIds: evento.parceiros ? evento.parceiros.map(p => p.id) : [],
      imagem: null
    });

    this.formEvento.markAsPristine();
    this.formEvento.markAsUntouched();
    this.valoresOriginaisDoFormulario = this.obterValorComparavelFormulario();
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
    if (!this.modoEdicao) {
      return this.formEvento.dirty || this.imagemSelecionada !== null;
    }

    if (this.imagemSelecionada !== null) {
      return true;
    }

    return JSON.stringify(this.obterValorComparavelFormulario()) !==
      JSON.stringify(this.valoresOriginaisDoFormulario);
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.modalAberto && this.temAlteracoes;
  }

  fecharModal(): void {
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      this.fecharModalSemConfirmacao();
      return;
    }

    Alertas.confirmarDescarte().then((confirmado) => {
      this.ngZone.run(() => {
        if (confirmado) {
          this.fecharModalSemConfirmacao();
        } else {
          this.dispararTremorModal();
        }

        this.cdr.detectChanges();
      });
    });
  }

  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
    this.modalTremendo = false;
    this.isLoading = false;
    this.eventoSelecionadoId = null;
    this.prepararEstadoFormulario();
    this.formEvento.get('imagem')?.setValidators([Validators.required, validarImagem()]);
    this.formEvento.get('imagem')?.updateValueAndValidity();
    this.formEvento.reset({ valor: '', parceirosIds: [], imagem: null });
    this.formEvento.markAsPristine();
  }

  private prepararEstadoFormulario(): void {
    this.erros = {};
    this.isLoading = false;
    this.imagemPreview = null;
    this.nomeArquivoSelecionado = '';
    this.imagemSelecionada = null;
    this.valorNumerico = null;
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

  verificarErros(): void {
    this.erros = mapearErrosFormulario(this.formEvento, {
      imagem: {
        required: 'Imagem obrigatoria no cadastro.'
      }
    });
  }

  onImagemSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    const imagemControl = this.formEvento.get('imagem');
    imagemControl?.setValue(arquivo);
    imagemControl?.markAsDirty();
    imagemControl?.markAsTouched();
    imagemControl?.updateValueAndValidity();
    this.formEvento.markAsDirty();
    this.verificarErros();

    if (imagemControl?.invalid) {
      this.imagemSelecionada = null;
      this.nomeArquivoSelecionado = '';
      this.imagemPreview = null;
      input.value = '';
      this.verificarErros();
      this.cdr.detectChanges();
      return;
    }

    this.imagemSelecionada = arquivo;
    this.nomeArquivoSelecionado = arquivo.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagemPreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(arquivo);
  }


  aplicarMascaraValor(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = String(input.value).replace(/\D/g, '');

    if (!digitos) {
      this.valorNumerico = null;
      this.formEvento.get('valor')?.setValue('', { emitEvent: false });
      this.formEvento.get('valor')?.markAsDirty();
      return;
    }

    const numero = Number(digitos) / 100;
    this.valorNumerico = numero;
    this.formEvento.get('valor')?.setValue(this.formatarMoeda(numero), { emitEvent: false });
    this.formEvento.get('valor')?.markAsDirty();
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  private formatarDataTabela(data: Date | string): string {
    if (!data) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(data));
  }

  formatarDataParaInput(data: Date | string): string {
    if (!data) return '';
    const d = new Date(data);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

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
        titulo: formValues.titulo,
        descricao: formValues.descricao,
        dataEvento: formValues.dataEvento,
        endereco: formValues.endereco,
        tipoEvento: formValues.tipoEvento,
        parceirosIds: formValues.parceirosIds,
        valor: this.valorNumerico ?? undefined,
        imagem: this.imagemSelecionada ?? undefined
      };

      this.eventoService.atualizar(this.eventoSelecionadoId!, dto).subscribe({
        next: () => {
          this.fecharModalSemConfirmacao();
          this.carregarEventos();
          this.toastr.success('Evento atualizado com sucesso!', 'Sucesso');
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao atualizar evento.', 'Erro');
          this.cdr.detectChanges();
        }
      });

      return;
    }

    const dto: CriarEventoDTO = {
      titulo: formValues.titulo,
      descricao: formValues.descricao,
      dataEvento: formValues.dataEvento,
      endereco: formValues.endereco,
      tipoEvento: formValues.tipoEvento,
      parceirosIds: formValues.parceirosIds,
      valor: this.valorNumerico ?? undefined,
      imagem: this.imagemSelecionada ?? formValues.imagem
    };

    this.eventoService.criar(dto).subscribe({
      next: () => {
        this.fecharModalSemConfirmacao();
        this.carregarEventos();
        this.toastr.success('Evento criado com sucesso!', 'Sucesso');
      },
      error: (err) => {
        this.isLoading = false;
        this.toastr.error(err.error?.message || 'Erro ao criar evento.', 'Erro');
        this.cdr.detectChanges();
      }
    });
  }

  executarAcao(evento: { tipo: string; linha: Evento }): void {
    if (evento.tipo === 'visualizar') {
      this.abrirVisualizacao(evento.linha);
      return;
    }

    if (evento.tipo === 'editar') {
      this.abrirEdicao(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir') {
      this.deletarEvento(evento.linha);
    }
  }

  deletarEvento(evento: Evento): void {
    Alertas.confirmarExclusao().then((confirmado) => {
      if (!confirmado) return;

      this.eventoService.deletar(evento.id).subscribe({
        next: () => {
          this.carregarEventos();
          this.toastr.success('Evento excluido com sucesso!', 'Sucesso');
        },
        error: () => {
          this.toastr.error('Erro ao excluir evento.', 'Erro');
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

    if (checkbox.checked && !selecionados.includes(id)) {
      selecionados.push(id);
    }

    if (!checkbox.checked) {
      const index = selecionados.indexOf(id);
      if (index !== -1) selecionados.splice(index, 1);
    }

    this.formEvento.patchValue({ parceirosIds: selecionados });
    this.formEvento.get('parceirosIds')?.markAsDirty();
    this.formEvento.markAsDirty();
  }

  private obterValorComparavelFormulario(): any {
    const valor = this.formEvento.getRawValue();
    return {
      titulo: valor.titulo,
      descricao: valor.descricao,
      dataEvento: valor.dataEvento,
      endereco: valor.endereco,
      tipoEvento: valor.tipoEvento,
      valor: this.valorNumerico,
      parceirosIds: valor.parceirosIds || []
    };
  }
}
