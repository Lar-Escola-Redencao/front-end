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
import { AssistidoService } from 'src/app/shared/services/usuario/usuario.service';
import { ContatoService } from 'src/app/shared/services/usuario/contato.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { AssistidoResponseDTO, CriarAssistidoDTO } from 'src/app/shared/models/usuario.model';
import {
  ContatoListagemDTO,
  UsuarioVinculadoDTO
} from 'src/app/shared/models/contato.model';
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
  selector: 'app-usuario',
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
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(AssistidoService); // chamadas de backend: nome mantido
  private readonly contatoService = inject(ContatoService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly turmaService = inject(TurmaService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessao = inject(SessaoService);

  abaAtiva: 'usuarios' | 'contatos' = 'usuarios';
  todosUsuarios: AssistidoResponseDTO[] = [];
  usuarios: AssistidoResponseDTO[] = [];
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

  // permissõess
  get isMonitor(): boolean {
    return this.sessao.isMonitor();
  }

  get podeCadastrarUsuario(): boolean {
    return this.sessao.podeCadastrarUsuario();
  }

  get podeGerenciarContatos(): boolean {
    return this.sessao.podeGerenciarContatos();
  }

  /** Ações da tabela de usuários — Monitor só enxerga "ver". */
  get acoesTabelaUsuariosAtual(): TabelaAcao<AssistidoResponseDTO>[] {
    return this.isMonitor ? this.acoesTabelaUsuariosSomenteView : this.acoesTabelaUsuarios;
  }

  /** Ações da tabela de contatos (não exibida para Monitor, ver template). */
  get acoesTabelaContatosAtual(): TabelaAcao<ContatoListagemDTO>[] {
    return this.podeGerenciarContatos ? this.acoesTabelaContatos : this.acoesTabelaContatosSomenteView;
  }

  // Modais e Controles
  modalAberto = false;
  modoEdicao = false;
  modalTremendo = false;
  isLoading = false;
  isCarregandoEdicao = false;
  etapaModal = 1;
  contatoExpandidoIndex = 0;
  usuarioSelecionadoId: number | null = null;
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

  // Modal de Preview do Usuário
  modalPreviewUsuarioAberto = false;
  usuarioPreview: any = null;

  // Modal de Preview do Contato
  modalPreviewContatoAberto = false;
  contatoPreview: ContatoListagemDTO | null = null;

  // Modal "Usuários vinculados"
  modalVinculosAberto = false;
  contatoSelecionado: ContatoListagemDTO | null = null;
  vinculosDoContato: UsuarioVinculadoDTO[] = [];
  carregandoVinculos = false;

  // Modal "Novo vínculo"
  modalNovoVinculoAberto = false;
  isSalvandoVinculo = false;
  formNovoVinculo = this.fb.group({
    idUnidade: this.fb.control<number | null>(null, Validators.required),
    idTurma: this.fb.control<number | null>({ value: null, disabled: true }, Validators.required),
    idUsuario: this.fb.control<number | null>({ value: null, disabled: true }, Validators.required),
    usuarioBusca: this.fb.control<string>({ value: '', disabled: true }),
    parentesco: ['', Validators.required],
    principal: [false]
  });
  turmasDoVinculo: any[] = [];
  usuariosParaVinculo: AssistidoResponseDTO[] = [];
  usuarioSelecionadoParaVinculo: AssistidoResponseDTO | null = null;

  fotoPreviewUrl: string | ArrayBuffer | null = null; // Para mostrar um preview rápido no form

  formUsuario!: FormGroup;
  erros: { [key: string]: string } = {};
  valoresOriginaisDoFormulario: any = null;

  opcoesAutocomplete: ContatoListagemDTO[][] = [];
  unidadesDisponiveis: any[] = []; // filtradas por acesso do coordenador (cadastro/edição de usuário)
  todasUnidades: any[] = []; // sem filtro — usada em "Novo vínculo" (só a remoção de vínculo é restrita)
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

  // Ações da tabela
  colunas: TabelaColuna<AssistidoResponseDTO>[] = [
    { chave: 'nomeCompleto', titulo: 'Nome do Usuário', principalMobile: true, ordenavel: true },
    { chave: 'cpf', titulo: 'CPF/Documento', formatar: (v, linha) => v || linha.documentoAuxiliar || '-' },
    {
      chave: 'dataNascimento',
      titulo: 'Data de Nascimento',
      formatar: (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR') : '-'
    },
    { titulo: 'Turma', chave: 'nomeTurma' as keyof AssistidoResponseDTO }
  ];

  private readonly acoesTabelaUsuarios: TabelaAcao<AssistidoResponseDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar detalhes', acao: 'ver' },
    { icone: 'edit', tooltip: 'Editar', acao: 'editar' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir' }
  ];

  private readonly acoesTabelaUsuariosSomenteView: TabelaAcao<AssistidoResponseDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar detalhes', acao: 'ver' }
  ];

  // Colunas da tabela de Contatos: Nome, Telefone, E-mail, Vínculos
  colunasContatos: TabelaColuna<ContatoListagemDTO>[] = [
    { chave: 'nomeCompleto', titulo: 'Nome do Responsável', principalMobile: true, ordenavel: true },
    { chave: 'telefone', titulo: 'Telefone', formatar: (v) => formatarTelefone(v) },
    { chave: 'email', titulo: 'E-mail', formatar: (v) => v || '-' },
    { chave: 'quantidadeVinculos', titulo: 'Vínculos' }
  ];

  // Ícones na ordem do layout: Visualizar, Usuários vinculados, Editar, Excluir
  private readonly acoesTabelaContatos: TabelaAcao<ContatoListagemDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar detalhes', acao: 'ver_contato' },
    { icone: 'account_child_invert', tooltip: 'Usuários vinculados', acao: 'ver_vinculos' },
    { icone: 'edit', tooltip: 'Editar contato', acao: 'editar_contato' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir_contato' }
  ];

  private readonly acoesTabelaContatosSomenteView: TabelaAcao<ContatoListagemDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar detalhes', acao: 'ver_contato' },
    { icone: 'account_child_invert', tooltip: 'Usuários vinculados', acao: 'ver_vinculos' }
  ];


  onFotoSelecionada(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fotoSelecionada = file;
      delete this.erros['foto'];

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
    this.sessao.carregar().subscribe(() => {
      this.carregarUnidades();
      this.cdr.detectChanges();
    });

    this.formNovoVinculo.get('principal')?.valueChanges.subscribe(() => this.verificarPrincipalDuplicado());

    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);

      let aba: 'usuarios' | 'contatos' = params.get('aba') === 'contatos' ? 'contatos' : 'usuarios';

      // Monitor só visualiza contatos através do usuário — a aba dedicada não é exibida para ele.
      if (aba === 'contatos' && this.isMonitor) {
        aba = 'usuarios';
      }
      this.abaAtiva = aba;

      if (this.abaAtiva === 'usuarios') {
        if (this.todosUsuarios.length === 0 && !this.carregandoLista) {
           this.carregarUsuarios();
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

  mudarAba(aba: 'usuarios' | 'contatos') {
    if (aba === 'contatos' && this.isMonitor) return;
    if (this.abaAtiva === aba) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: aba, page: 0, sort: null },
      queryParamsHandling: 'merge'
    });
  }

  carregarUsuarios(): void {
    if (this.carregandoLista) return;
    this.carregandoLista = true;
    this.erroLista = false;

    this.usuarioService.listarAssistidos().subscribe({
      next: (resposta) => {
        this.ngZone.run(() => {
          this.todosUsuarios = resposta;
          this.aplicarPaginacao();
          this.carregandoLista = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.carregandoLista = false;
          this.erroLista = true;
          this.toastr.error('Erro ao carregar a lista de usuários.', 'Erro');
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
    let lista = [...this.todosUsuarios];

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
    this.usuarios = lista.slice(inicio, inicio + this.tamanho);
  }

  carregarUnidades() {
    this.unidadeService.listarTodas().subscribe(dados => {
      this.todasUnidades = dados;

      const permitidas = this.sessao.unidadesPermitidasIds();
      this.unidadesDisponiveis = permitidas === null
        ? dados
        : dados.filter((u: any) => permitidas.includes(u.id));
    });
  }

  onUnidadeChange(idUnidade: number) {
    const turmaCtrl = this.formUsuario.get('idTurma');
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
    this.formUsuario = this.fb.group({
      nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
      dataNascimento: ['', Validators.required],
      endereco: ['', [Validators.required, Validators.minLength(5)]],
      usarOutroDocumento: [false],
      cpf: ['', [Validators.required, Validators.minLength(14)]],
      tipoDocumento: [''],
      documentoAuxiliar: [''],
      idUnidade: [null, Validators.required],
      idTurma: this.fb.control<number | null>({ value: null, disabled: true }, Validators.required),
      contatos: this.fb.array([])
    });

    this.formUsuario.get('usarOutroDocumento')?.valueChanges.subscribe((usarOutro) => {
      const cpfCtrl = this.formUsuario.get('cpf');
      const tipoDocCtrl = this.formUsuario.get('tipoDocumento');
      const docAuxCtrl = this.formUsuario.get('documentoAuxiliar');

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
    return this.formUsuario.get('contatos') as FormArray;
  }

  abrirCadastro() {
    if (!this.podeCadastrarUsuario) return;

    this.modoEdicao = false;
    this.usuarioSelecionadoId = null;
    this.etapaModal = 1;
    this.contatoExpandidoIndex = 0;
    this.erros = {};
    this.isLoading = false;
    this.isCarregandoEdicao = false;

    this.iniciarFormulario();
    this.adicionarContato(true);
    this.formUsuario.markAsPristine();
    this.formUsuario.markAsUntouched();
    this.valoresOriginaisDoFormulario = this.formUsuario.getRawValue();

    this.modalAberto = true;
  }

  abrirEdicao(usuarioLista: AssistidoResponseDTO) {
    if (!this.sessao.podeEditarUsuario(usuarioLista.idUnidade)) {
      this.toastr.warning('Você não tem acesso à unidade deste usuário.', 'Acesso negado');
      return;
    }

    this.modoEdicao = true;
    this.usuarioSelecionadoId = usuarioLista.id;
    this.etapaModal = 1;
    this.contatoExpandidoIndex = 0;
    this.erros = {};
    this.isLoading = false;
    this.isCarregandoEdicao = true;
    this.modalAberto = true;

    this.usuarioService.buscarPorId(usuarioLista.id).subscribe({
      next: (dadosCompletos) => {
        this.iniciarFormulario();
        this.fotoPreviewUrl = (dadosCompletos as any).imagem_perfil || null;
        const usaOutro = !dadosCompletos.cpf && !!dadosCompletos.documentoAuxiliar;

        this.formUsuario.patchValue({
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
          const turmaCtrl = this.formUsuario.get('idTurma');
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

        this.formUsuario.markAsPristine();
        this.formUsuario.markAsUntouched();
        this.valoresOriginaisDoFormulario = this.formUsuario.getRawValue();
        this.isCarregandoEdicao = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Erro ao carregar os dados do usuário.');
        this.fecharModalSemConfirmacao();
      }
    });
  }

  abrirPreviewUsuario(usuarioLista: AssistidoResponseDTO) {
    this.isLoading = true;
    this.usuarioService.buscarPorId(usuarioLista.id).subscribe({
      next: (dadosCompletos) => {
        this.ngZone.run(() => {
          this.usuarioPreview = dadosCompletos;
          this.isLoading = false;
          this.modalPreviewUsuarioAberto = true;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.toastr.error('Erro ao carregar detalhes do usuário.');
        this.isLoading = false;
      }
    });
  }

  fecharPreviewUsuario() {
    this.modalPreviewUsuarioAberto = false;
    this.usuarioPreview = null;
  }

  // Atalho para ir direto do preview para a edição
  editarDoPreviewUsuario() {
    const usuario = { ...this.usuarioPreview };
    this.fecharPreviewUsuario();
    this.abrirEdicao(usuario);
  }

  abrirPreviewContato(contato: ContatoListagemDTO) {
    this.contatoPreview = { ...contato, telefone: formatarTelefone(contato.telefone) };
    this.modalPreviewContatoAberto = true;
  }

  fecharPreviewContato() {
    this.modalPreviewContatoAberto = false;
    this.contatoPreview = null;
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
    this.formUsuario.reset();
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
      step1Controls.forEach(c => this.formUsuario.get(c)?.markAsTouched());
      this.verificarErros();

      const nomeInvalido = this.formUsuario.get('nomeCompleto')?.invalid;
      const dataInvalida = this.formUsuario.get('dataNascimento')?.invalid;
      const enderecoInvalido = this.formUsuario.get('endereco')?.invalid;
      const cpfInvalido = this.formUsuario.get('cpf')?.invalid;
      const tipoDocInvalido = this.formUsuario.get('tipoDocumento')?.invalid;
      const docAuxInvalido = this.formUsuario.get('documentoAuxiliar')?.invalid;

      if (this.fotoValida()) {
        delete this.erros['foto'];
      } else {
        this.erros['foto'] = 'A foto de perfil é obrigatória.';
      }

      if (nomeInvalido || dataInvalida || enderecoInvalido || cpfInvalido || tipoDocInvalido || docAuxInvalido || !this.fotoValida()) {
        return;
      }
    }
    else if (this.etapaModal === 2) {
      ['idUnidade', 'idTurma'].forEach(c => this.formUsuario.get(c)?.markAsTouched());
      this.verificarErros();

      if (this.formUsuario.get('idUnidade')?.invalid || this.formUsuario.get('idTurma')?.invalid) {
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

  // Validações e Máscaras
  verificarErros() {
    this.erros = mapearErrosFormulario(this.formUsuario);
  }

  aplicarMascaraCpf(event: Event) {
    const input = event.target as HTMLInputElement;
    this.formUsuario.get('cpf')?.setValue(formatarCpf(input.value), { emitEvent: false });
    this.verificarErros();
  }

  aplicarMascaraTelefoneContato(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    this.contatosArray.at(index).get('telefone')?.setValue(formatarTelefone(input.value), { emitEvent: false });
  }

  formatarDocumentoPreview(usuario: any): string {
    if (usuario.cpf) {
      return formatarCpf(usuario.cpf);
    }
    if (usuario.documentoAuxiliar) {
      return `${usuario.documentoAuxiliar} (${usuario.tipoDocumento || 'Outro'})`;
    }
    return 'Não informado';
  }

  fotoValida(): boolean {
    return !!this.fotoSelecionada || !!this.fotoPreviewUrl;
  }

  /** Mapeia o código de parentesco (ex.: "IRMAO") para o rótulo exibido (ex.: "Irmão / Irmã"). */
  labelParentesco(codigo: string): string {
    return this.opcoesParentesco.find(p => p.value === codigo)?.label || codigo;
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao) return this.formUsuario.dirty;
    return JSON.stringify(this.formUsuario.getRawValue()) !== JSON.stringify(this.valoresOriginaisDoFormulario);
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
    this.formUsuario.markAllAsTouched();
    this.verificarErros();

    if (!this.fotoValida()) {
      this.erros['foto'] = 'A foto de perfil é obrigatória.';
      this.etapaModal = 1;
      this.toastr.error('A foto de perfil é obrigatória.', 'Atenção');
      return;
    }

    for (let i = 0; i < this.contatosArray.length; i++) {
      (this.contatosArray.at(i) as FormGroup).markAllAsTouched();
    }

    if (this.formUsuario.invalid) {
      this.toastr.error('Verifique os campos obrigatórios na aba de contatos.', 'Atenção');
      return;
    }

    const dados = this.formUsuario.getRawValue();

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
      this.usuarioService.atualizar(this.usuarioSelecionadoId!, dto).subscribe({
        next: () => {
          this.processarUploadFoto(this.usuarioSelecionadoId!, 'Usuário atualizado com sucesso!');
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            const msgErro = err.error?.message || err.error?.detail || 'Erro ao atualizar usuário.';
            this.toastr.error(msgErro, 'Erro');
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      this.usuarioService.criar(dto).subscribe({
        next: (usuarioCriado: any) => {
          this.processarUploadFoto(usuarioCriado.id, 'Usuário cadastrado com sucesso!');
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            const msgErro = err.error?.message || err.error?.detail || 'Erro ao cadastrar usuário.';
            this.toastr.error(msgErro, 'Erro');
            this.cdr.detectChanges();
          });
        }
      });
    }
  }

  processarUploadFoto(idUsuario: number, mensagemSucesso: string) {
    if (this.fotoSelecionada) {
      this.usuarioService.atualizarFotoPerfil(idUsuario, this.fotoSelecionada).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.toastr.success(mensagemSucesso, 'Sucesso');
            this.fecharModalSemConfirmacao();
            this.todosUsuarios = [];
            this.carregarUsuarios();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.toastr.warning(mensagemSucesso + ' Mas houve um erro a enviar a foto.', 'Aviso');
            this.fecharModalSemConfirmacao();
            this.todosUsuarios = [];
            this.carregarUsuarios();
          });
        }
      });
    } else {
      this.ngZone.run(() => {
        this.isLoading = false;
        this.toastr.success(mensagemSucesso, 'Sucesso');
        this.fecharModalSemConfirmacao();
        this.todosUsuarios = [];
        this.carregarUsuarios();
      });
    }
  }

  // ações da tabela
  executarAcao(evento: { tipo: string; linha: any }) {
    if (this.abaAtiva === 'usuarios') {
      if (evento.tipo === 'ver' || evento.tipo === 'visualizar') this.abrirPreviewUsuario(evento.linha);
      if (evento.tipo === 'editar') this.abrirEdicao(evento.linha);
      if (evento.tipo === 'excluir') this.excluirUsuario(evento.linha);
      return;
    }

    // aba de contatos
    if (evento.tipo === 'ver_contato') this.abrirPreviewContato(evento.linha);
    if (evento.tipo === 'ver_vinculos') this.abrirVinculos(evento.linha);
    if (evento.tipo === 'editar_contato') this.abrirEdicaoContato(evento.linha);
    if (evento.tipo === 'excluir_contato') this.excluirContato(evento.linha);
  }

  abrirEdicaoContato(contato: ContatoListagemDTO) {
    if (!this.podeGerenciarContatos) return;

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
      nomeCompleto: dados.nomeCompleto!,
      telefone: dados.telefone?.replace(/\D/g, '') || '',
      email: dados.email || undefined,
      endereco: dados.endereco || undefined
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

  excluirUsuario(usuario: AssistidoResponseDTO) {
    if (!this.sessao.podeExcluirUsuario(usuario.idUnidade)) {
      this.toastr.warning('Você não tem acesso à unidade deste usuário.', 'Acesso negado');
      return;
    }

    Alertas.confirmarExclusao().then(confirmado => {
      if (!confirmado) return;

      this.carregandoLista = true;
      this.cdr.detectChanges();

      this.usuarioService.deletar(usuario.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toastr.success('Usuário excluído com sucesso!', 'Sucesso');
            this.carregandoLista = false;
            this.todosUsuarios = [];
            this.carregarUsuarios();
          });
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.carregandoLista = false;
            this.toastr.error(err.error?.message || 'Erro ao excluir usuário.', 'Erro');
            this.cdr.detectChanges();
          });
        }
      });
    });
  }

  excluirContato(contato: ContatoListagemDTO) {
    if (!this.podeGerenciarContatos) return;

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

  // Modal "USUÁRIOS VINCULADOS"
  abrirVinculos(contato: ContatoListagemDTO) {
    this.contatoSelecionado = contato;
    this.vinculosDoContato = [];
    this.modalVinculosAberto = true;
    this.carregandoVinculos = true;

    this.contatoService.buscarDetalhe(contato.id).subscribe({
      next: (detalhe) => {
        this.ngZone.run(() => {
          this.vinculosDoContato = detalhe.vinculos || [];
          this.carregandoVinculos = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.carregandoVinculos = false;
          this.toastr.error('Erro ao carregar os usuários vinculados a este contato.', 'Erro');
          this.cdr.detectChanges();
        });
      }
    });
  }

  fecharVinculos() {
    this.modalVinculosAberto = false;
    this.contatoSelecionado = null;
    this.vinculosDoContato = [];
  }

  /** Chamado quando a foto do vínculo falha ao carregar — cai para o placeholder. */
  onErroImagemVinculo(vinculo: UsuarioVinculadoDTO) {
    (vinculo as any).imagemPerfil = '';
  }

  podeRemoverEsteVinculo(vinculo: UsuarioVinculadoDTO): boolean {
    return this.sessao.podeRemoverVinculo(vinculo.idUnidade);
  }

  removerVinculo(vinculo: UsuarioVinculadoDTO) {
    if (!this.contatoSelecionado || !this.podeRemoverEsteVinculo(vinculo)) {
      this.toastr.warning('Você não tem acesso à unidade deste usuário.', 'Acesso negado');
      return;
    }

    Alertas.confirmarExclusao().then(confirmado => {
      if (!confirmado || !this.contatoSelecionado) return;

      this.usuarioService.desvincularContato(vinculo.idUsuario, this.contatoSelecionado.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toastr.success('Vínculo removido com sucesso!', 'Sucesso');
            this.vinculosDoContato = this.vinculosDoContato.filter(v => v.idUsuario !== vinculo.idUsuario);
            this.carregarContatos();
            this.cdr.detectChanges();
          });
        },
        error: (err: any) => {
          this.toastr.error(err.error?.message || 'Erro ao remover vínculo.', 'Erro');
        }
      });
    });
  }

  // Modal "NOVO VÍNCULO"
  abrirNovoVinculo(contato: ContatoListagemDTO) {
    if (!this.podeGerenciarContatos) return;

    this.contatoSelecionado = contato;
    this.turmasDoVinculo = [];
    this.usuariosParaVinculo = [];
    this.usuarioSelecionadoParaVinculo = null;
    this.formNovoVinculo.reset({ idUnidade: null, idTurma: null, idUsuario: null, usuarioBusca: '', parentesco: '', principal: false });
    this.formNovoVinculo.get('idTurma')?.disable();
    this.formNovoVinculo.get('idUsuario')?.disable();
    this.formNovoVinculo.get('usuarioBusca')?.disable();
    this.modalNovoVinculoAberto = true;

    this.garantirUsuariosCarregados();
  }

  onUnidadeVinculoChange(idUnidade: number) {
    const turmaCtrl = this.formNovoVinculo.get('idTurma');
    const usuarioCtrl = this.formNovoVinculo.get('idUsuario');
    const usuarioBuscaCtrl = this.formNovoVinculo.get('usuarioBusca');

    turmaCtrl?.setValue(null);
    usuarioCtrl?.setValue(null);
    usuarioBuscaCtrl?.setValue('');
    usuarioCtrl?.disable();
    usuarioBuscaCtrl?.disable();
    this.turmasDoVinculo = [];
    this.usuariosParaVinculo = [];

    if (idUnidade) {
      this.turmaService.listar(idUnidade).subscribe(turmas => {
        this.turmasDoVinculo = turmas.filter(t => t.unidade.id === idUnidade);
        turmaCtrl?.enable();
      });
    } else {
      turmaCtrl?.disable();
    }
  }

  onTurmaVinculoChange(idTurma: number) {
    const usuarioCtrl = this.formNovoVinculo.get('idUsuario');
    const usuarioBuscaCtrl = this.formNovoVinculo.get('usuarioBusca');

    usuarioCtrl?.setValue(null);
    usuarioBuscaCtrl?.setValue('');
    this.usuariosParaVinculo = this.todosUsuarios.filter(u => u.idTurma === idTurma);

    if (idTurma) {
      usuarioCtrl?.enable();
      usuarioBuscaCtrl?.enable();
    } else {
      usuarioCtrl?.disable();
      usuarioBuscaCtrl?.disable();
    }
  }

  get opcoesUsuarioVinculo(): AssistidoResponseDTO[] {
    const termo = (this.formNovoVinculo.get('usuarioBusca')?.value || '').toString().trim().toLowerCase();
    if (termo.length < 2) return [];
    return this.usuariosParaVinculo.filter(u => u.nomeCompleto.toLowerCase().includes(termo));
  }

  selecionarUsuarioVinculo(usuario: AssistidoResponseDTO) {
    this.formNovoVinculo.patchValue({ idUsuario: usuario.id, usuarioBusca: usuario.nomeCompleto }, { emitEvent: false });
    this.usuarioSelecionadoParaVinculo = null;

    this.usuarioService.buscarPorId(usuario.id).subscribe(dadosCompletos => {
      this.usuarioSelecionadoParaVinculo = dadosCompletos;
      this.verificarPrincipalDuplicado();
    });
  }

  /** Se o usuário selecionado já tem um contato principal, não deixa marcar este vínculo como principal também. */
  private verificarPrincipalDuplicado() {
    const principalCtrl = this.formNovoVinculo.get('principal');
    if (!principalCtrl?.value || !this.usuarioSelecionadoParaVinculo) return;

    const jaTemPrincipal = (this.usuarioSelecionadoParaVinculo.contatos || []).some((c: any) => c.principal);
    if (jaTemPrincipal) {
      principalCtrl.setValue(false, { emitEvent: false });
      this.toastr.warning('Este usuário já possui um contato principal. Não é possível marcar outro.', 'Atenção');
    }
  }

  fecharNovoVinculo() {
    this.modalNovoVinculoAberto = false;
    this.contatoSelecionado = null;
    this.usuarioSelecionadoParaVinculo = null;
  }

  /** Carrega a lista de usuários (uma vez) para alimentar o passo "Usuário" do vínculo. */
  private garantirUsuariosCarregados() {
    if (this.todosUsuarios.length > 0) return;
    this.usuarioService.listarAssistidos().subscribe(resposta => {
      this.todosUsuarios = resposta;
    });
  }

  salvarNovoVinculo() {
    this.formNovoVinculo.markAllAsTouched();

    if (this.formNovoVinculo.invalid || !this.contatoSelecionado) return;

    const dados = this.formNovoVinculo.getRawValue();

    const jaTemPrincipal = (this.usuarioSelecionadoParaVinculo?.contatos || []).some((c: any) => c.principal);
    if (dados.principal && jaTemPrincipal) {
      this.toastr.error('Não é possível salvar: este usuário já possui um contato principal.', 'Erro');
      return;
    }

    this.isSalvandoVinculo = true;

    this.usuarioService.vincularContatoExistente(dados.idUsuario!, this.contatoSelecionado.id, {
      parentesco: dados.parentesco!,
      principal: !!dados.principal
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSalvandoVinculo = false;
          this.toastr.success('Vínculo criado com sucesso!', 'Sucesso');
          this.fecharNovoVinculo();
          this.carregarContatos();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.isSalvandoVinculo = false;
          this.toastr.error(err.error?.message || 'Erro ao criar vínculo.', 'Erro');
          this.cdr.detectChanges();
        });
      }
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
