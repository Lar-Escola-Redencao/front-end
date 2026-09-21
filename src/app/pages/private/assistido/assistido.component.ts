import {
  ChangeDetectorRef,
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ToastrService } from 'ngx-toastr';

import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaAcao,
  TabelaColuna,
  TabelaLayout
} from '@components/tabela-layout/tabela-layout';
import { Paginacao } from '@components/paginacao/paginacao';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { AssistidoService } from 'src/app/shared/services/assistido/assistido.service';
import { ContatoService } from 'src/app/shared/services/contato/contato.service';
import { AssistidoResponseDTO, CriarAssistidoDTO } from 'src/app/shared/models/assistido.model';
import { ContatoListagemDTO } from 'src/app/shared/models/contato.model';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import { formatarCpf, formatarTelefone } from 'src/app/shared/utils/masks';

import {
  CampoOrdenacao,
  alternarOrdenacao,
  analisarOrdenacao,
  lerParametrosPagina
} from 'src/app/shared/utils/paginacao-url';
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';

@Component({
  selector: 'app-assistido',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    Paginacao,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatAutocompleteModule,
    MatCheckboxModule
  ],
  templateUrl: './assistido.component.html',
  styleUrls: ['./assistido.component.css']
})
export class AssistidoComponent implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  private readonly fb = inject(FormBuilder);
  private readonly assistidoService = inject(AssistidoService);
  private readonly contatoService = inject(ContatoService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly turmaService = inject(TurmaService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // =========================================================
  // LISTAGEM, ABAS E PAGINAÇÃO
  // =========================================================
  abaAtiva: 'assistidos' | 'contatos' = 'assistidos';
  todosAssistidos: AssistidoResponseDTO[] = [];
  assistidos: AssistidoResponseDTO[] = [];
  contatos: ContatoListagemDTO[] = [];

  pagina = 0;
  tamanho = 10;
  sort: string | undefined;
  ordenacao: CampoOrdenacao | null = null;
  totalElementos = 0;
  totalPaginas = 0;
  carregandoLista = false;
  erroLista = false;
  private routeSub?: Subscription;

  // =========================================================
  // MODAIS E CONTROLES
  // =========================================================
  modalAberto = false;
  modoEdicao = false;
  modalTremendo = false;
  isLoading = false;
  isCarregandoEdicao = false;
  etapaModal = 1;
  contatoExpandidoIndex = 0;
  assistidoSelecionadoId: number | null = null;
  fotoSelecionada: File | null = null;

  // Modal Rápido de Contato
  modalContatoAberto = false;
  contatoEmEdicaoId: number | null = null;
  formEdicaoContato = this.fb.group({
    nomeCompleto: ['', Validators.required],
    telefone: ['', [Validators.required, Validators.minLength(14)]],
    email: ['', Validators.email],
    endereco: ['']
  });

  // Modais de Preview
  modalPreviewAssistidoAberto = false;
  assistidoPreview: any = null;

  modalPreviewContatoAberto = false;
  contatoPreview: any = null;

  fotoPreviewUrl: string | ArrayBuffer | null = null; // Para mostrar um preview rápido no form

  formAssistido!: FormGroup;
  erros: { [key: string]: string } = {};
  valoresOriginaisDoFormulario: any = null;

  opcoesAutocomplete: ContatoListagemDTO[][] = [];
  unidadesDisponiveis: any[] = [];
  turmasDisponiveis: any[] = [];

  readonly opcoesParentesco = [
    { label: 'Avô / Avó', value: 'AVO' },
    { label: 'Primo / Prima', value: 'PRIMO' },
    { label: 'Irmão / Irmã', value: 'IRMAO' },
    { label: 'Tio / Tia', value: 'TIO' },
    { label: 'Pai', value: 'PAI' },
    { label: 'Mãe', value: 'MAE' },
    { label: 'Outro', value: 'OUTRO' }
  ];

  readonly tiposDocumento = [
    { label: 'Certidão de Nascimento', value: 'CERTIDAO_NASCIMENTO' },
    { label: 'Outro', value: 'OUTRO' }
  ];

  // =========================================================
  // COLUNAS E AÇÕES DAS TABELAS
  // =========================================================
  colunas: TabelaColuna<AssistidoResponseDTO>[] = [
    { chave: 'nomeCompleto', titulo: 'Nome do Assistido', principalMobile: true, ordenavel: true },
    { chave: 'cpf', titulo: 'CPF/Documento', formatar: (v, linha) => v || linha.documentoAuxiliar || '-' },
    {
      chave: 'dataNascimento',
      titulo: 'Data de Nascimento',
      formatar: (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR') : '-'
    },
    { titulo: 'Turma', chave: 'nomeTurma' as keyof AssistidoResponseDTO }
  ];

  acoesTabela: TabelaAcao<AssistidoResponseDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar detalhes', acao: 'ver' },
    { icone: 'edit', tooltip: 'Editar', acao: 'editar' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir' }
  ];

  colunasContatos: TabelaColuna<ContatoListagemDTO>[] = [
    { chave: 'nomeCompleto', titulo: 'Nome do Responsável', principalMobile: true, ordenavel: true },
    { chave: 'telefone', titulo: 'Telefone', formatar: (v) => formatarTelefone(v) },
    { chave: 'quantidadeVinculos', titulo: 'Vínculos Ativos' }
  ];

  acoesTabelaContatos: TabelaAcao<ContatoListagemDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar detalhes', acao: 'ver' },
    { icone: 'edit', tooltip: 'Editar contato', acao: 'editar_contato' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir_contato' }
  ];

  // =========================================================
  // CICLO DE VIDA E ABAS
  // =========================================================

  onFotoSelecionada(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fotoSelecionada = file;

      const reader = new FileReader();
      reader.onload = e => {
        this.fotoPreviewUrl = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  ngOnInit(): void {
    this.iniciarFormulario();
    this.carregarUnidades();

    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);

      this.abaAtiva = params.get('aba') === 'contatos' ? 'contatos' : 'assistidos';

      if (this.abaAtiva === 'assistidos') {
        if (this.todosAssistidos.length === 0 && !this.carregandoLista) {
           this.carregarAssistidos();
        } else {
           this.aplicarPaginacao();
        }
      } else {
        this.carregarContatos();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  mudarAba(aba: 'assistidos' | 'contatos') {
    if (this.abaAtiva === aba) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: aba, page: 0, sort: null },
      queryParamsHandling: 'merge'
    });
  }

  carregarAssistidos(): void {
    if (this.carregandoLista) return;
    this.carregandoLista = true;
    this.erroLista = false;

    this.assistidoService.listarAssistidos().subscribe({
      next: (resposta) => {
        this.ngZone.run(() => {
          this.todosAssistidos = resposta;
          this.aplicarPaginacao();
          this.carregandoLista = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.carregandoLista = false;
          this.erroLista = true;
          this.toastr.error('Erro ao carregar a lista de assistidos.', 'Erro');
          this.cdr.detectChanges();
        });
      }
    });
  }

  carregarContatos(): void {
    if (this.carregandoLista) return;
    this.carregandoLista = true;
    this.erroLista = false;

    this.contatoService.listarContatos(this.pagina, this.tamanho, this.sort).subscribe({
      next: (resposta) => {
        this.ngZone.run(() => {
          this.contatos = resposta.content;
          this.totalElementos = resposta.page.totalElements;
          this.totalPaginas = resposta.page.totalPages;
          this.carregandoLista = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.carregandoLista = false;
          this.erroLista = true;
          this.toastr.error('Erro ao carregar a lista de contatos.', 'Erro');
          this.cdr.detectChanges();
        });
      }
    });
  }

  aplicarPaginacao(): void {
    let lista = [...this.todosAssistidos];

    if (this.ordenacao) {
      const { campo, direcao } = this.ordenacao;
      lista.sort((a: any, b: any) => {
        const valA = a[campo] || '';
        const valB = b[campo] || '';
        if (valA < valB) return direcao === 'asc' ? -1 : 1;
        if (valA > valB) return direcao === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.totalElementos = lista.length;
    this.totalPaginas = Math.ceil(this.totalElementos / this.tamanho) || 1;

    if (this.pagina >= this.totalPaginas && this.totalPaginas > 0) {
      this.irParaPagina(this.totalPaginas - 1);
      return;
    }

    const inicio = this.pagina * this.tamanho;
    this.assistidos = lista.slice(inicio, inicio + this.tamanho);
  }

  carregarUnidades() {
    this.unidadeService.listarTodas().subscribe(dados => {
      this.unidadesDisponiveis = dados;
    });
  }

  onUnidadeChange(idUnidade: number) {
    const turmaCtrl = this.formAssistido.get('idTurma');
    turmaCtrl?.setValue(null);
    turmaCtrl?.disable();
    this.turmasDisponiveis = [];

    if (idUnidade) {
      this.turmaService.listar(idUnidade).subscribe(turmas => {
        this.turmasDisponiveis = turmas.filter(t => t.unidade.id === idUnidade);
        turmaCtrl?.enable();
      });
    }
  }

  iniciarFormulario() {
    this.formAssistido = this.fb.group({
      nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
      dataNascimento: ['', Validators.required],
      endereco: ['', [Validators.required, Validators.minLength(5)]],
      usarOutroDocumento: [false],
      cpf: ['', [Validators.required, Validators.minLength(14)]],
      tipoDocumento: [''],
      documentoAuxiliar: [''],
      idUnidade: [null, Validators.required],
      idTurma: [{ value: null, disabled: true }, Validators.required],
      contatos: this.fb.array([])
    });

    this.formAssistido.get('usarOutroDocumento')?.valueChanges.subscribe((usarOutro) => {
      const cpfCtrl = this.formAssistido.get('cpf');
      const tipoDocCtrl = this.formAssistido.get('tipoDocumento');
      const docAuxCtrl = this.formAssistido.get('documentoAuxiliar');

      if (usarOutro) {
        cpfCtrl?.clearValidators();
        tipoDocCtrl?.setValidators([Validators.required]);
        docAuxCtrl?.setValidators([Validators.required]);
      } else {
        cpfCtrl?.setValidators([Validators.required, Validators.minLength(14)]);
        tipoDocCtrl?.clearValidators();
        docAuxCtrl?.clearValidators();
      }

      cpfCtrl?.updateValueAndValidity();
      tipoDocCtrl?.updateValueAndValidity();
      docAuxCtrl?.updateValueAndValidity();

      this.verificarErros();
    });
  }

  get contatosArray(): FormArray {
    return this.formAssistido.get('contatos') as FormArray;
  }

  abrirCadastro() {
    this.modoEdicao = false;
    this.assistidoSelecionadoId = null;
    this.etapaModal = 1;
    this.contatoExpandidoIndex = 0;
    this.erros = {};
    this.isLoading = false;
    this.isCarregandoEdicao = false;

    this.iniciarFormulario();
    this.adicionarContato(true);
    this.formAssistido.markAsPristine();
    this.formAssistido.markAsUntouched();
    this.valoresOriginaisDoFormulario = this.formAssistido.getRawValue();

    this.modalAberto = true;
  }

  abrirEdicao(assistidoLista: AssistidoResponseDTO) {
    this.modoEdicao = true;
    this.assistidoSelecionadoId = assistidoLista.id;
    this.etapaModal = 1;
    this.contatoExpandidoIndex = 0;
    this.erros = {};
    this.isLoading = false;
    this.isCarregandoEdicao = true;
    this.modalAberto = true;

    this.assistidoService.buscarPorId(assistidoLista.id).subscribe({
      next: (dadosCompletos) => {
        this.iniciarFormulario();
        this.fotoPreviewUrl = (dadosCompletos as any).imagem_perfil || null;
        const usaOutro = !dadosCompletos.cpf && !!dadosCompletos.documentoAuxiliar;

        this.formAssistido.patchValue({
          nomeCompleto: dadosCompletos.nomeCompleto,
          dataNascimento: dadosCompletos.dataNascimento ? dadosCompletos.dataNascimento.split('T')[0] : '',
          endereco: dadosCompletos.endereco,
          usarOutroDocumento: usaOutro,
          cpf: dadosCompletos.cpf ? formatarCpf(dadosCompletos.cpf) : '',
          tipoDocumento: dadosCompletos.tipoDocumento || '',
          documentoAuxiliar: dadosCompletos.documentoAuxiliar || '',
          idUnidade: dadosCompletos.idUnidade || null
        });

        if (dadosCompletos.idUnidade) {
          const turmaCtrl = this.formAssistido.get('idTurma');
          this.turmaService.listar(dadosCompletos.idUnidade).subscribe(turmas => {
            this.turmasDisponiveis = turmas.filter(t => t.unidade.id === dadosCompletos.idUnidade);
            turmaCtrl?.enable();
            turmaCtrl?.setValue(dadosCompletos.idTurma || null);
          });
        }

        this.contatosArray.clear();
        if (dadosCompletos.contatos && dadosCompletos.contatos.length > 0) {
          dadosCompletos.contatos.forEach((c, index) => {
            const contatoForm = this.fb.group({
              id: [c.id],
              nomeCompleto: [c.nomeCompleto, Validators.required],
              parentesco: [c.parentesco, Validators.required],
              telefone: [formatarTelefone(c.telefone), [Validators.required, Validators.minLength(14)]],
              email: [c.email, Validators.email],
              endereco: [c.endereco],
              principal: [c.principal]
            });

            this.contatosArray.push(contatoForm);
            this.configurarAutocomplete(contatoForm, index);
          });
        } else {
          this.adicionarContato(true);
        }

        this.formAssistido.markAsPristine();
        this.formAssistido.markAsUntouched();
        this.valoresOriginaisDoFormulario = this.formAssistido.getRawValue();
        this.isCarregandoEdicao = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Erro ao carregar os dados do assistido.');
        this.fecharModalSemConfirmacao();
      }
    });
  }

  abrirPreviewAssistido(assistidoLista: AssistidoResponseDTO) {
    this.isLoading = true;
    this.assistidoService.buscarPorId(assistidoLista.id).subscribe({
      next: (dadosCompletos) => {
        this.ngZone.run(() => {
          this.assistidoPreview = dadosCompletos;
          this.isLoading = false;
          this.modalPreviewAssistidoAberto = true;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.toastr.error('Erro ao carregar detalhes do assistido.');
        this.isLoading = false;
      }
    });
  }

  fecharPreviewAssistido() {
    this.modalPreviewAssistidoAberto = false;
    this.assistidoPreview = null;
  }

  abrirPreviewContato(contato: ContatoListagemDTO) {
    let nomesVinculados: string[] = [];

    // Usando 'this.assistidos' e tipando explicitamente os parâmetros
    if (this.assistidos && this.assistidos.length > 0) {
      nomesVinculados = this.assistidos
        .filter((ass: AssistidoResponseDTO) => ass.contatos?.some((c: any) => c.nomeCompleto === contato.nomeCompleto))
        .map((ass: AssistidoResponseDTO) => ass.nomeCompleto);
    }

    this.contatoPreview = {
      ...contato,
      email: contato.email || 'Não informado',
      endereco: (contato as any).endereco || 'Não informado',

      assistidosVinculados: nomesVinculados.length > 0
        ? nomesVinculados
        : ['Nomes indisponíveis (Aguardando API)']
    };

    this.modalPreviewContatoAberto = true;
  }

  fecharPreviewContato() {
    this.modalPreviewContatoAberto = false;
    this.contatoPreview = null;
  }

  // Atalho para ir direto do preview para a edição
  editarDoPreviewAssistido() {
    const assistido = { ...this.assistidoPreview };
    this.fecharPreviewAssistido();
    this.abrirEdicao(assistido);
  }

  fecharModal() {
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

  private fecharModalSemConfirmacao() {
    this.modalAberto = false;
    this.modalTremendo = false;
    this.formAssistido.reset();
    this.contatosArray.clear();
    this.fotoSelecionada = null;
    this.fotoPreviewUrl = null;
  }

  private dispararTremorModal() {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  proximaEtapa() {
    if (this.etapaModal === 1) {
      const step1Controls = ['nomeCompleto', 'dataNascimento', 'endereco', 'cpf', 'tipoDocumento', 'documentoAuxiliar', 'usarOutroDocumento'];
      step1Controls.forEach(c => this.formAssistido.get(c)?.markAsTouched());
      this.verificarErros();

      const nomeInvalido = this.formAssistido.get('nomeCompleto')?.invalid;
      const dataInvalida = this.formAssistido.get('dataNascimento')?.invalid;
      const enderecoInvalido = this.formAssistido.get('endereco')?.invalid;
      const cpfInvalido = this.formAssistido.get('cpf')?.invalid;
      const tipoDocInvalido = this.formAssistido.get('tipoDocumento')?.invalid;
      const docAuxInvalido = this.formAssistido.get('documentoAuxiliar')?.invalid;

      if (nomeInvalido || dataInvalida || enderecoInvalido || cpfInvalido || tipoDocInvalido || docAuxInvalido) {
        return;
      }
    }
    else if (this.etapaModal === 2) {
      ['idUnidade', 'idTurma'].forEach(c => this.formAssistido.get(c)?.markAsTouched());
      this.verificarErros();

      if (this.formAssistido.get('idUnidade')?.invalid || this.formAssistido.get('idTurma')?.invalid) {
        return;
      }
    }

    if (this.etapaModal < 3) this.etapaModal++;
  }

  voltarEtapa() {
    if (this.etapaModal > 1) this.etapaModal--;
  }

  adicionarContato(isPrincipal = false) {
    if (this.contatosArray.length >= 4) {
      this.toastr.warning('Máximo de 4 responsáveis atingido.');
      return;
    }

    const contatoForm = this.fb.group({
      id: [null],
      nomeCompleto: ['', Validators.required],
      parentesco: ['', Validators.required],
      telefone: ['', [Validators.required, Validators.minLength(14)]],
      email: ['', Validators.email],
      endereco: [''],
      principal: [isPrincipal]
    });

    this.contatosArray.push(contatoForm);
    const index = this.contatosArray.length - 1;
    this.contatoExpandidoIndex = index;

    this.configurarAutocomplete(contatoForm, index);
  }

  private configurarAutocomplete(contatoForm: FormGroup, index: number) {
    this.opcoesAutocomplete[index] = [];

    contatoForm.get('nomeCompleto')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(termo => {
        if (contatoForm.get('id')?.value) {
          contatoForm.get('id')?.setValue(null, { emitEvent: false });
        }

        if (termo && typeof termo === 'string' && termo.trim().length >= 3) {
          return this.contatoService.buscarAutocomplete(termo.trim()).pipe(
            catchError(() => of([]))
          );
        }
        return of([]);
      })
    ).subscribe(resultados => {
      this.opcoesAutocomplete[index] = resultados.map(r => ({
        ...r,
        telefone: formatarTelefone(r.telefone)
      }));
      this.cdr.detectChanges();
    });
  }

  removerContato(index: number, event?: Event) {
    if (event) event.stopPropagation();

    if (this.contatosArray.at(index).get('principal')?.value) {
      this.toastr.warning('O contato principal não pode ser removido.');
      return;
    }
    this.contatosArray.removeAt(index);
    this.opcoesAutocomplete.splice(index, 1);
    this.contatoExpandidoIndex = Math.max(0, this.contatosArray.length - 1);
  }

  expandirContato(index: number) {
    this.contatoExpandidoIndex = this.contatoExpandidoIndex === index ? -1 : index;
  }

  selecionarContatoExistente(index: number, contato: ContatoListagemDTO) {
    const formGroup = this.contatosArray.at(index) as FormGroup;
    formGroup.patchValue({
      id: contato.id,
      nomeCompleto: contato.nomeCompleto,
      telefone: formatarTelefone(contato.telefone),
      email: contato.email,
      endereco: contato.endereco
    }, { emitEvent: false });

    this.opcoesAutocomplete[index] = [];
  }

  // =========================================================
  // VALIDAÇÕES E MÁSCARAS
  // =========================================================
  verificarErros() {
    this.erros = mapearErrosFormulario(this.formAssistido);
  }

  aplicarMascaraCpf(event: Event) {
    const input = event.target as HTMLInputElement;
    this.formAssistido.get('cpf')?.setValue(formatarCpf(input.value), { emitEvent: false });
    this.verificarErros();
  }

  aplicarMascaraTelefoneContato(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.contatosArray.at(index).get('telefone')?.setValue(formatarTelefone(input.value), { emitEvent: false });
  }

  formatarDocumentoPreview(assistido: any): string {
    if (assistido.cpf) {
      return formatarCpf(assistido.cpf);
    }
    if (assistido.documentoAuxiliar) {
      return `${assistido.documentoAuxiliar} (${assistido.tipoDocumento || 'Outro'})`;
    }
    return 'Não informado';
  }

  // =========================================================
  // CAN DEACTIVATE & SUBMIT
  // =========================================================
  get temAlteracoes(): boolean {
    if (!this.modoEdicao) return this.formAssistido.dirty;
    return JSON.stringify(this.formAssistido.getRawValue()) !== JSON.stringify(this.valoresOriginaisDoFormulario);
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.modalAberto && this.temAlteracoes;
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  salvar() {
    this.formAssistido.markAllAsTouched();
    this.verificarErros();

    for (let i = 0; i < this.contatosArray.length; i++) {
      (this.contatosArray.at(i) as FormGroup).markAllAsTouched();
    }

    if (this.formAssistido.invalid) {
      this.toastr.error('Verifique os campos obrigatórios na aba de contatos.', 'Atenção');
      return;
    }

    const dados = this.formAssistido.getRawValue();

    const contatos = dados.contatos || [];
    const telefones = contatos.map((c: any) => c.telefone?.replace(/\D/g, '')).filter((t: string) => !!t);
    const ids = contatos.map((c: any) => c.id).filter((id: any) => id !== null);

    if (new Set(telefones).size !== telefones.length || (ids.length > 0 && new Set(ids).size !== ids.length)) {
      this.toastr.warning('Não é possível adicionar o mesmo contato mais do que uma vez.', 'Contatos duplicados');
      return;
    }

    this.isLoading = true;

    const dto: CriarAssistidoDTO = {
      nomeCompleto: dados.nomeCompleto,
      dataNascimento: dados.dataNascimento,
      cpf: dados.usarOutroDocumento ? null : dados.cpf?.replace(/\D/g, ''),
      documentoAuxiliar: dados.usarOutroDocumento ? dados.documentoAuxiliar : null,
      tipoDocumento: dados.usarOutroDocumento ? dados.tipoDocumento : null,
      endereco: dados.endereco,
      idTurma: dados.idTurma,
      contatos: (dados.contatos as any[]).map((c) => ({
        id: c.id,
        nomeCompleto: c.nomeCompleto,
        telefone: c.telefone?.replace(/\D/g, ''),
        email: c.email,
        endereco: c.endereco,
        parentesco: c.parentesco,
        principal: c.principal
      }))
    };

    if (this.modoEdicao) {
      this.assistidoService.atualizar(this.assistidoSelecionadoId!, dto).subscribe({
        next: () => {
          // Se atualizou fixe, chamamos a foto com o ID já conhecido
          this.processarUploadFoto(this.assistidoSelecionadoId!, 'Assistido atualizado com sucesso!');
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            const msgErro = err.error?.message || err.error?.detail || 'Erro ao atualizar assistido.';
            this.toastr.error(msgErro, 'Erro');
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      this.assistidoService.criar(dto).subscribe({
        next: (assistidoCriado: any) => {
          this.processarUploadFoto(assistidoCriado.id, 'Assistido cadastrado com sucesso!');
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            const msgErro = err.error?.message || err.error?.detail || 'Erro ao cadastrar assistido.';
            this.toastr.error(msgErro, 'Erro');
            this.cdr.detectChanges();
          });
        }
      });
    }
  }

  processarUploadFoto(idAssistido: number, mensagemSucesso: string) {
    if (this.fotoSelecionada) {
      this.assistidoService.atualizarFotoPerfil(idAssistido, this.fotoSelecionada).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.toastr.success(mensagemSucesso, 'Sucesso');
            this.fecharModalSemConfirmacao();
            this.todosAssistidos = [];
            this.carregarAssistidos();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.toastr.warning(mensagemSucesso + ' Mas houve um erro a enviar a foto.', 'Aviso');
            this.fecharModalSemConfirmacao();
            this.todosAssistidos = [];
            this.carregarAssistidos();
          });
        }
      });
    } else {
      this.ngZone.run(() => {
        this.isLoading = false;
        this.toastr.success(mensagemSucesso, 'Sucesso');
        this.fecharModalSemConfirmacao();
        this.todosAssistidos = [];
        this.carregarAssistidos();
      });
    }
  }

  // =========================================================
  // AÇÕES DA TABELA E NAVEGAÇÃO
  // =========================================================
  executarAcao(evento: { tipo: string; linha: any }) {
    if (evento.tipo === 'ver' || evento.tipo === 'visualizar') {
      if (this.abaAtiva === 'assistidos') {
        this.abrirPreviewAssistido(evento.linha);
      } else {
        this.abrirPreviewContato(evento.linha);
      }
    }
    if (evento.tipo === 'editar') this.abrirEdicao(evento.linha);
    if (evento.tipo === 'excluir') this.excluirAssistido(evento.linha);

    if (evento.tipo === 'editar_contato') this.abrirEdicaoContato(evento.linha);
    if (evento.tipo === 'excluir_contato') this.excluirContato(evento.linha);
  }

  abrirEdicaoContato(contato: ContatoListagemDTO) {
    this.contatoEmEdicaoId = contato.id;
    this.formEdicaoContato.patchValue({
      nomeCompleto: contato.nomeCompleto,
      telefone: formatarTelefone(contato.telefone),
      email: contato.email || '',
      endereco: (contato as any).endereco || ''
    });
    this.modalContatoAberto = true;
  }

  fecharModalContato() {
    this.modalContatoAberto = false;
    this.contatoEmEdicaoId = null;
    this.formEdicaoContato.reset();
  }

  salvarEdicaoContato() {
    if (this.formEdicaoContato.invalid || !this.contatoEmEdicaoId) {
      this.formEdicaoContato.markAllAsTouched();
      return;
    }

    const dados = this.formEdicaoContato.getRawValue();
    const dto = {
      nomeCompleto: dados.nomeCompleto,
      telefone: dados.telefone?.replace(/\D/g, ''),
      email: dados.email || undefined,
      endereco: dados.endereco
    };

    this.isLoading = true;
    this.contatoService.atualizarContato(this.contatoEmEdicaoId, dto).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.toastr.success('Contato atualizado com sucesso!', 'Sucesso');
          this.fecharModalContato();
          this.carregarContatos();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao atualizar contato.', 'Erro');
        });
      }
    });
  }

  excluirAssistido(assistido: AssistidoResponseDTO) {
    Alertas.confirmarExclusao().then(confirmado => {
      if (!confirmado) return;

      this.carregandoLista = true;
      this.cdr.detectChanges();

      this.assistidoService.deletar(assistido.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toastr.success('Assistido excluído com sucesso!', 'Sucesso');
            this.carregandoLista = false;
            this.todosAssistidos = [];
            this.carregarAssistidos();
          });
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.carregandoLista = false;
            this.toastr.error(err.error?.message || 'Erro ao excluir assistido.', 'Erro');
            this.cdr.detectChanges();
          });
        }
      });
    });
  }

  excluirContato(contato: ContatoListagemDTO) {
    if (contato.quantidadeVinculos > 0) {
      this.toastr.warning(`Não é possível excluir. Este contato possui ${contato.quantidadeVinculos} vínculo(s) ativo(s).`, 'Atenção');
      return;
    }

    Alertas.confirmarExclusao().then(confirmado => {
      if (!confirmado) return;

      this.carregandoLista = true;
      this.cdr.detectChanges();

      this.contatoService.deletarContato(contato.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toastr.success('Contato excluído com sucesso!', 'Sucesso');
            this.carregandoLista = false;
            this.carregarContatos();
          });
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.carregandoLista = false;
            this.toastr.error(err.error?.message || 'Erro ao excluir contato.', 'Erro');
            this.cdr.detectChanges();
          });
        }
      });
    });
  }

  ordenarPor(campo: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: alternarOrdenacao(this.ordenacao, campo), page: 0 },
      queryParamsHandling: 'merge'
    });
  }

  irParaPagina(pagina: number) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: pagina }, queryParamsHandling: 'merge' });
  }

  mudarTamanhoPagina(tamanho: number) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { size: tamanho, page: 0 }, queryParamsHandling: 'merge' });
  }
}
