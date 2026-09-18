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
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

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
import { AssistidoService, ContatoService } from 'src/app/shared/services/assistido/assistido.service';
import { AssistidoResponseDTO } from 'src/app/shared/models/assistido.model';
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

  assistidos: AssistidoResponseDTO[] = [];
  pagina = 0;
  tamanho = 10;
  sort: string | undefined;
  ordenacao: CampoOrdenacao | null = null;
  totalElementos = 0;
  totalPaginas = 0;
  carregandoLista = false;
  erroLista = false;
  private routeSub?: Subscription;

  modalAberto = false;
  modoEdicao = false;
  modalTremendo = false;
  isLoading = false;
  etapaModal = 1;
  contatoExpandidoIndex = 0;
  assistidoSelecionadoId: number | null = null;

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

  colunas: TabelaColuna<AssistidoResponseDTO>[] = [
    { chave: 'nomeCompleto', titulo: 'Nome do Assistido', principalMobile: true, ordenavel: true },
    { chave: 'cpf', titulo: 'CPF/Documento', formatar: (v, linha) => v || linha.documentoAuxiliar || '-' },
    {
      chave: 'dataNascimento',
      titulo: 'Data de Nascimento',
      formatar: (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR') : '-'
    }
  ];

  acoesTabela: TabelaAcao<AssistidoResponseDTO>[] = [
    { icone: 'edit', tooltip: 'Editar', acao: 'editar' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir' }
  ];

  todosAssistidos: AssistidoResponseDTO[] = []; // <-- ADICIONAR ISTO

  ngOnInit(): void {
    this.iniciarFormulario();
    this.carregarUnidades();

    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);

      // Paginação local: se já tem os dados em memória, apenas reorganiza
      if (this.todosAssistidos.length === 0 && !this.carregandoLista) {
         this.carregarAssistidos();
      } else {
         this.aplicarPaginacao();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
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
    this.formAssistido.get('idTurma')?.setValue(null);
    this.turmasDisponiveis = [];
    if (idUnidade) {
      this.turmaService.listar(idUnidade).subscribe(turmas => {
        this.turmasDisponiveis = turmas;
      });
    }
  }

  iniciarFormulario() {
    this.formAssistido = this.fb.group({
      nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
      dataNascimento: ['', Validators.required],
      endereco: ['', [Validators.required, Validators.minLength(5)]],
      usarOutroDocumento: [false],
      // CPF começa como obrigatório por padrão
      cpf: ['', [Validators.required, Validators.minLength(14)]],
      tipoDocumento: [''],
      documentoAuxiliar: [''],
      idUnidade: [null, Validators.required],
      idTurma: [null, Validators.required],
      contatos: this.fb.array([])
    });

    // Alterna a obrigatoriedade dinamicamente
    this.formAssistido.get('usarOutroDocumento')?.valueChanges.subscribe((usarOutro) => {
      const cpfCtrl = this.formAssistido.get('cpf');
      const tipoDocCtrl = this.formAssistido.get('tipoDocumento');
      const docAuxCtrl = this.formAssistido.get('documentoAuxiliar');

      if (usarOutro) {
        cpfCtrl?.clearValidators(); // Remove validação do CPF
        tipoDocCtrl?.setValidators([Validators.required]);
        docAuxCtrl?.setValidators([Validators.required]);
      } else {
        cpfCtrl?.setValidators([Validators.required, Validators.minLength(14)]); // Retorna validação do CPF
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

    this.iniciarFormulario();
    this.adicionarContato(true); // Insere contato principal
    this.formAssistido.markAsPristine();
    this.valoresOriginaisDoFormulario = this.formAssistido.getRawValue();

    this.modalAberto = true;
  }

  abrirEdicao(assistido: AssistidoResponseDTO) {
    this.toastr.info('Edição de assistido será implementada em breve.', 'Aviso');
    // Implementação da carga de edição entraria aqui.
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
  }

  private dispararTremorModal() {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  proximaEtapa() {
    this.formAssistido.markAllAsTouched();
    this.verificarErros();

    if (this.etapaModal === 1) {
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
      email: [''],
      endereco: [''],
      principal: [isPrincipal]
    });

    this.contatosArray.push(contatoForm);
    const index = this.contatosArray.length - 1;
    this.opcoesAutocomplete[index] = [];
    this.contatoExpandidoIndex = index;

    // RxJS Deduplicação
    contatoForm.get('nomeCompleto')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(termo => {
        if (termo && typeof termo === 'string' && termo.length >= 3 && !contatoForm.get('id')?.value) {
          return this.contatoService.buscarAutocomplete(termo);
        }
        return of([]);
      })
    ).subscribe(resultados => {
      this.opcoesAutocomplete[index] = resultados;
      this.cdr.detectChanges();
    });
  }

  removerContato(index: number) {
    if (this.contatosArray.at(index).get('principal')?.value) {
      this.toastr.warning('O contato principal não pode ser removido.');
      return;
    }
    this.contatosArray.removeAt(index);
    this.opcoesAutocomplete.splice(index, 1);
    this.contatoExpandidoIndex = Math.max(0, this.contatosArray.length - 1);
  }

  expandirContato(index: number) {
    this.contatoExpandidoIndex = index;
  }

  selecionarContatoExistente(index: number, contato: ContatoListagemDTO) {
    const formGroup = this.contatosArray.at(index) as FormGroup;
    formGroup.patchValue({
      id: contato.id,
      nomeCompleto: contato.nomeCompleto,
      telefone: formatarTelefone(contato.telefone),
      email: contato.email,
      endereco: contato.endereco
    });
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

    // Forçar validação visual nos arrays
    for (let i = 0; i < this.contatosArray.length; i++) {
      (this.contatosArray.at(i) as FormGroup).markAllAsTouched();
    }

    if (this.formAssistido.invalid) {
      this.toastr.error('Verifique os campos obrigatórios na aba de contatos.');
      return;
    }

    this.isLoading = true;
    const dados = this.formAssistido.getRawValue();

    const dto = {
      nomeCompleto: dados.nomeCompleto,
      dataNascimento: dados.dataNascimento,
      cpf: dados.usarOutroDocumento ? null : dados.cpf?.replace(/\D/g, ''),
      documentoAuxiliar: dados.usarOutroDocumento ? dados.documentoAuxiliar : null,
      tipoDocumento: dados.usarOutroDocumento ? dados.tipoDocumento : null,
      endereco: dados.endereco,
      idTurma: dados.idTurma,
      contatos: (dados.contatos as any[]).map((c) => ({
        ...c,
        telefone: c.telefone?.replace(/\D/g, '')
      }))
    };

    if (this.modoEdicao) {
      // Atualizar
    } else {
      this.assistidoService.criar(dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastr.success('Assistido cadastrado com sucesso!', 'Sucesso');
          this.fecharModalSemConfirmacao();
          this.carregarAssistidos();
        },
        error: (err: any) => {
          this.isLoading = false;
          this.toastr.error(err.error?.message || 'Erro ao cadastrar assistido.', 'Erro');
          this.cdr.detectChanges();
        }
      });
    }
  }

  // =========================================================
  // AÇÕES DA TABELA E NAVEGAÇÃO
  // =========================================================
  executarAcao(evento: { tipo: string; linha: AssistidoResponseDTO }) {
    if (evento.tipo === 'editar') this.abrirEdicao(evento.linha);
    if (evento.tipo === 'excluir') {
      // Implementar exclusão com Alertas.confirmarExclusao()
      this.toastr.info('Exclusão será implementada em breve.');
    }
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
