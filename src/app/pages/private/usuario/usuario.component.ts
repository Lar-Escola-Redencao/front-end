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
import { Subscription, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { ToastrService } from 'ngx-toastr';

import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaAcao,
  TabelaColuna,
  TabelaLayout
} from '@components/tabela-layout/tabela-layout';
import { Paginacao } from '@components/paginacao/paginacao';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { ContatoService } from 'src/app/shared/services/usuario/contato.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { UsuarioResponseDTO, CadastroUsuarioCompletoDTO } from 'src/app/shared/models/usuario.model';
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
    MatAutocompleteModule
  ],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
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
  todosUsuarios: UsuarioResponseDTO[] = [];
  usuarios: UsuarioResponseDTO[] = [];
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
  private buscaVinculoSub?: Subscription;
  private formSubs: Subscription[] = [];
  private readonly mensagemCpfDuplicado = 'Usuário já possui uma matrícula ativa.';

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
  get acoesTabelaUsuariosAtual(): TabelaAcao<UsuarioResponseDTO>[] {
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
  familiarExpandidoIndex = -1;
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
    idUsuario: this.fb.control<number | null>(null),
    usuarioBusca: this.fb.control<string>({ value: '', disabled: true }),
    parentesco: ['', Validators.required],
    principal: [false]
  });
  turmasDoVinculo: any[] = [];
  usuariosParaVinculo: UsuarioResponseDTO[] = [];
  usuarioSelecionadoParaVinculo: UsuarioResponseDTO | null = null;

  fotoPreviewUrl: string | ArrayBuffer | null = null; // Para mostrar um preview rápido no form

  formUsuario!: FormGroup;
  erros: { [key: string]: string } = {};
  valoresOriginaisDoFormulario: any = null;

  opcoesAutocomplete: ContatoListagemDTO[][] = [];
  unidadesDisponiveis: any[] = []; // filtradas por acesso do coordenador (cadastro/edição de usuário)
  todasUnidades: any[] = []; // sem filtro — usada em "Novo vínculo" (só a remoção de vínculo é restrita)
  turmasDisponiveis: any[] = [];
  arquivosSaude: File[] = [];
  erroArquivos = '';
  readonly limiteArquivo = 30 * 1024 * 1024;
  readonly etapas = ['Dados pessoais', 'Contatos', 'Dados socioeconômicos', 'Dados complementares', 'Matrícula'];
  readonly periodosEscolares = ['MANHA', 'TARDE', 'INTEGRAL', 'OUTRO'];
  readonly seriesEscolares = ['PRE_ESCOLA', ...Array.from({ length: 9 }, (_, i) => `SERIE_${i + 1}`), 'EM'];
  readonly tiposMoradia = [
    { value: 'ALUGADA', label: 'Alugada' }, { value: 'PROPRIA', label: 'Própria' },
    { value: 'APARTAMENTO_ALUGADO', label: 'Apartamento alugado' },
    { value: 'APARTAMENTO_PROPRIO', label: 'Apartamento próprio' }, { value: 'OUTRO', label: 'Outro' }
  ];
  readonly escolaridades = ['ANALFABETO', 'ALFABETIZADO', 'FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO'];
  readonly despesas = [
    { campo: 'despesaEnergia', label: 'Energia' }, { campo: 'despesaAgua', label: 'Água' },
    { campo: 'despesaInternet', label: 'Internet' }, { campo: 'despesaTelefone', label: 'Telefone' },
    { campo: 'despesaMercado', label: 'Mercado' }, { campo: 'despesaFarmacia', label: 'Farmácia' },
    { campo: 'despesaFinanciamentos', label: 'Financiamentos' }, { campo: 'despesaOutras', label: 'Outras' }
  ];
  readonly transportes = [
    { campo: 'utilizaCarro', valor: 'gastoCarro', label: 'Carro' },
    { campo: 'utilizaMoto', valor: 'gastoMoto', label: 'Moto' },
    { campo: 'utilizaTransportePublico', valor: 'gastoTransportePublico', label: 'Transporte público' },
    { campo: 'utilizaVan', valor: 'gastoVan', label: 'Van / transporte particular' },
    { campo: 'andandoOuBicicleta', valor: '', label: 'Caminhando / bicicleta' }
  ];
  readonly perguntasSaude = [
    { campo: 'possuiProblemaSaude', descricao: 'descProblemaSaude', label: 'Possui alguma condição de saúde?' },
    { campo: 'usaMedicacao', descricao: 'descMedicacao', label: 'Usa medicação?' },
    { campo: 'temAlergia', descricao: 'descAlergia', label: 'Tem alergia?' }
  ];
  readonly opcoesBuscaContato = ['CPF', 'Telefone', 'Nome', 'E-mail'];
  readonly religioes = ['Católica', 'Evangélica', 'Espírita', 'Religião de Matriz Africana', 'Sem Religião', 'Outra'];

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
  colunas: TabelaColuna<UsuarioResponseDTO>[] = [
    { chave: 'nomeCompleto', titulo: 'Nome do Usuário', principalMobile: true, ordenavel: true },
    { chave: 'cpf', titulo: 'CPF/Documento', formatar: (v, linha) => v || linha.documentoAuxiliar || '-' },
    {
      chave: 'dataNascimento',
      titulo: 'Data de Nascimento',
      formatar: (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR') : '-'
    },
    {
      titulo: 'Turma',
      chave: 'nomeTurma',
      formatar: (_valor, linha) => this.formatarUnidadeTurmaTabela(linha)
    }
  ];

  private readonly acoesTabelaUsuarios: TabelaAcao<UsuarioResponseDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar detalhes', acao: 'ver' },
    { icone: 'edit', tooltip: 'Editar', acao: 'editar' },
    { icone: 'delete', tooltip: 'Excluir', acao: 'excluir' }
  ];

  private readonly acoesTabelaUsuariosSomenteView: TabelaAcao<UsuarioResponseDTO>[] = [
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
      if (this.isMonitor && this.abaAtiva === 'contatos') this.mudarAba('usuarios');
      this.cdr.detectChanges();
    });

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
    this.buscaVinculoSub?.unsubscribe();
    this.formSubs.forEach(sub => sub.unsubscribe());
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

    this.usuarioService.listarUsuarios().subscribe({
      next: (resposta) => {
        this.ngZone.run(() => {
          this.todosUsuarios = resposta.filter(u => u.status !== 'EXCLUIDO');
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
    this.formSubs.forEach(sub => sub.unsubscribe());
    this.formSubs = [];

    this.formUsuario = this.fb.group({
      nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
      dataNascimento: ['', Validators.required],
      usarOutroDocumento: [false],
      cpf: ['', [Validators.required, Validators.minLength(14)]],
      tipoDocumento: [''], documentoAuxiliar: [''], cadUnico: [''],
      endereco: ['', Validators.required], bairro: ['', Validators.required], cep: [''],
      escola: ['', Validators.required], periodoEscolar: ['', Validators.required],
      serieEscolar: ['', Validators.required], raEscolar: [''],
      contatos: this.fb.array([]),
      socioeconomico: this.fb.group({
        composicaoFamiliar: this.fb.array([]), tipoMoradia: ['', Validators.required],
        valorAluguel: [null], valorFinanciamento: [null],
        despesaEnergia: [null], despesaAgua: [null], despesaInternet: [null],
        despesaTelefone: [null], despesaMercado: [null], despesaFarmacia: [null],
        despesaFinanciamentos: [null], despesaOutras: [null]
      }),
      complementares: this.fb.group({
        utilizaCarro: [false], gastoCarro: [null], utilizaMoto: [false], gastoMoto: [null],
        utilizaTransportePublico: [false], gastoTransportePublico: [null],
        utilizaVan: [false], gastoVan: [null], andandoOuBicicleta: [false],
        professaReligiao: [false], religiao: [''], outraReligiao: [''],
        possuiProblemaSaude: [false], descProblemaSaude: [''],
        usaMedicacao: [false], descMedicacao: [''], temAlergia: [false], descAlergia: ['']
      }),
      idUnidade: [null, Validators.required],
      idTurma: this.fb.control<number | null>({ value: null, disabled: true }, Validators.required)
    });
    this.formSubs.push(this.formUsuario.get('socioeconomico.tipoMoradia')!.valueChanges.subscribe(tipo => {
      const aluguel = this.formUsuario.get('socioeconomico.valorAluguel')!;
      aluguel.setValidators(tipo === 'ALUGADA' || tipo === 'APARTAMENTO_ALUGADO' ? [Validators.required, Validators.min(0)] : []);
      aluguel.updateValueAndValidity();
    }));
    this.formSubs.push(this.formUsuario.get('complementares.professaReligiao')!.valueChanges.subscribe(professa => {
      const religiao = this.formUsuario.get('complementares.religiao')!;
      religiao.setValidators(professa ? [Validators.required] : []);
      if (!professa) {
        religiao.setValue('');
        this.formUsuario.get('complementares.outraReligiao')?.setValue('');
      }
      religiao.updateValueAndValidity();
    }));
    this.formSubs.push(this.formUsuario.get('complementares.religiao')!.valueChanges.subscribe(tipo => {
      const outra = this.formUsuario.get('complementares.outraReligiao')!;
      outra.setValidators(tipo === 'Outra' ? [Validators.required] : []);
      outra.updateValueAndValidity();
    }));
    for (const [flag, descricao] of [['possuiProblemaSaude', 'descProblemaSaude'], ['usaMedicacao', 'descMedicacao'], ['temAlergia', 'descAlergia']]) {
      this.formSubs.push(this.formUsuario.get(`complementares.${flag}`)!.valueChanges.subscribe(ativo => {
        const controle = this.formUsuario.get(`complementares.${descricao}`)!;
        controle.setValidators(ativo ? [Validators.required] : []);
        controle.updateValueAndValidity();
      }));
    }

    const usarOutroDocumentoSub = this.formUsuario.get('usarOutroDocumento')?.valueChanges.subscribe((usarOutro) => {
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

    const cpfSub = this.formUsuario.get('cpf')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.verificarCpfCadastradoDinamicamente());

    if (usarOutroDocumentoSub) this.formSubs.push(usarOutroDocumentoSub);
    if (cpfSub) this.formSubs.push(cpfSub);
  }

  get contatosArray(): FormArray {
    return this.formUsuario.get('contatos') as FormArray;
  }

  get familiaresArray(): FormArray {
    return this.formUsuario.get('socioeconomico.composicaoFamiliar') as FormArray;
  }

  adicionarFamiliar(): void {
    this.familiaresArray.push(this.fb.group({
      nomeCompleto: ['', Validators.required], idade: [null],
      parentescoVinculo: ['', Validators.required], escolaridade: ['', Validators.required],
      renda: [null], beneficios: [null]
    }));
    this.familiarExpandidoIndex = this.familiaresArray.length - 1;
  }

  expandirFamiliar(index: number): void {
    this.familiarExpandidoIndex = this.familiarExpandidoIndex === index ? -1 : index;
  }

  removerFamiliar(index: number): void {
    this.familiaresArray.removeAt(index);
    if (this.familiarExpandidoIndex === index) this.familiarExpandidoIndex = -1;
    else if (this.familiarExpandidoIndex > index) this.familiarExpandidoIndex--;
  }

  get totalDespesasMensais(): number {
    return this.despesas.reduce((total, despesa) => total + (Number(this.formUsuario.get('socioeconomico.' + despesa.campo)?.value) || 0), 0);
  }

  selecionarArquivosSaude(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.erroArquivos = '';
    for (const arquivo of Array.from(input.files || [])) {
      if (!/\.(pdf|jpe?g|png)$/i.test(arquivo.name) || !['application/pdf', 'image/jpeg', 'image/png'].includes(arquivo.type)) {
        this.erroArquivos = 'Envie somente PDF, JPG ou PNG.';
        continue;
      }
      if (arquivo.size > this.limiteArquivo) {
        this.erroArquivos = 'Cada arquivo deve ter até 30 MB.';
        continue;
      }
      if (this.arquivosSaude.length >= 4) {
        this.erroArquivos = 'Selecione no máximo 4 arquivos.';
        break;
      }
      this.arquivosSaude.push(arquivo);
    }
    input.value = '';
  }

  removerArquivoSaude(index: number): void {
    this.arquivosSaude.splice(index, 1);
  }

  abrirCadastro() {
    if (!this.podeCadastrarUsuario) return;

    this.modoEdicao = false;
    this.usuarioSelecionadoId = null;
    this.etapaModal = 1;
    this.contatoExpandidoIndex = 0;
    this.familiarExpandidoIndex = -1;
    this.erros = {};
    this.isLoading = false;
    this.isCarregandoEdicao = false;

    this.iniciarFormulario();
    this.arquivosSaude = [];
    this.fotoSelecionada = null;
    this.fotoPreviewUrl = null;
    this.adicionarContato(true);
    this.adicionarFamiliar();
    this.formUsuario.markAsPristine();
    this.formUsuario.markAsUntouched();
    this.valoresOriginaisDoFormulario = this.formUsuario.getRawValue();

    this.modalAberto = true;
  }

  abrirEdicao(usuarioLista: UsuarioResponseDTO) {
    if (!this.sessao.podeEditarUsuario(usuarioLista.idUnidade)) {
      this.toastr.warning('Você não tem acesso à unidade deste usuário.', 'Acesso negado');
      return;
    }

    this.modoEdicao = true;
    this.usuarioSelecionadoId = usuarioLista.id;
    this.etapaModal = 1;
    this.contatoExpandidoIndex = 0;
    this.familiarExpandidoIndex = -1;
    this.erros = {};
    this.isLoading = false;
    this.isCarregandoEdicao = true;
    this.fotoSelecionada = null;
    this.arquivosSaude = [];
    this.modalAberto = true;

    this.usuarioService.buscarPorId(usuarioLista.id).subscribe({
      next: (dadosCompletos) => {
        this.iniciarFormulario();
        this.fotoPreviewUrl = dadosCompletos.imagemPerfil || null;
        const usaOutro = !dadosCompletos.cpf && !!dadosCompletos.documentoAuxiliar;

        this.formUsuario.patchValue({
          nomeCompleto: dadosCompletos.nomeCompleto,
          dataNascimento: dadosCompletos.dataNascimento ? dadosCompletos.dataNascimento.split('T')[0] : '',
          endereco: dadosCompletos.endereco,
          bairro: dadosCompletos.bairro || '', cep: dadosCompletos.cep || '',
          escola: dadosCompletos.escola || '', periodoEscolar: dadosCompletos.periodoEscolar || '',
          serieEscolar: dadosCompletos.serieEscolar || '', raEscolar: dadosCompletos.raEscolar || '',
          cadUnico: dadosCompletos.cadUnico || '',
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
              endereco: [c.endereco], cpf: [c.cpf || ''], localTrabalho: [c.localTrabalho || ''],
              busca: [''], tipoBusca: ['CPF'], buscarExistente: [true], principal: [c.principal]
            });

            this.contatosArray.push(contatoForm);
            this.configurarAutocomplete(contatoForm, index);
            this.alternarBuscaContato(index, true);
          });
        } else {
          this.adicionarContato(true);
        }

        this.formUsuario.get('socioeconomico.tipoMoradia')?.setValue('OUTRO');
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

  abrirPreviewUsuario(usuarioLista: UsuarioResponseDTO) {
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
    this.familiaresArray.clear();
    this.familiarExpandidoIndex = -1;
    this.fotoSelecionada = null;
    this.arquivosSaude = [];
    this.fotoPreviewUrl = null;
  }

  private dispararTremorModal() {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  proximaEtapa(): void {
    if (this.etapaModal === 1) {
      for (const campo of ['nomeCompleto', 'dataNascimento', 'cpf', 'tipoDocumento', 'documentoAuxiliar', 'endereco', 'bairro', 'escola', 'periodoEscolar', 'serieEscolar']) {
        this.formUsuario.get(campo)?.markAsTouched();
      }
      if (['nomeCompleto', 'dataNascimento', 'cpf', 'tipoDocumento', 'documentoAuxiliar', 'endereco', 'bairro', 'escola', 'periodoEscolar', 'serieEscolar'].some(c => this.formUsuario.get(c)?.invalid)) return;
    } else if (this.etapaModal === 2 && (!this.contatosArray.length || this.contatosArray.invalid || this.contatosArray.controls.some(c => c.get('buscarExistente')?.value && !c.get('id')?.value))) {
      this.contatosArray.markAllAsTouched();
      this.toastr.warning('Selecione um contato existente ou desmarque a busca para cadastrar um novo contato.');
      return;
    } else if (this.etapaModal === 3 && this.formUsuario.get('socioeconomico')?.invalid) {
      this.formUsuario.get('socioeconomico')?.markAllAsTouched();
      return;
    } else if (this.etapaModal === 4 && this.formUsuario.get('complementares')?.invalid) {
      this.formUsuario.get('complementares')?.markAllAsTouched();
      return;
    }
    this.verificarErros();
    if (this.etapaModal < 5) this.etapaModal++;
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
      endereco: [''], cpf: [''], localTrabalho: [''],
      busca: [''], tipoBusca: ['CPF'], buscarExistente: [false], principal: [isPrincipal]
    });

    this.contatosArray.push(contatoForm);
    const index = this.contatosArray.length - 1;
    this.contatoExpandidoIndex = index;

    this.configurarAutocomplete(contatoForm, index);
    this.alternarBuscaContato(index, false);
  }

  private configurarAutocomplete(contatoForm: FormGroup, index: number): void {
    this.opcoesAutocomplete[index] = [];
    const sub = contatoForm.get('busca')!.valueChanges.pipe(
      debounceTime(400), distinctUntilChanged(),
      switchMap(termo => contatoForm.get('buscarExistente')?.value && typeof termo === 'string' && termo.trim().length >= 2
        ? this.contatoService.buscarAutocomplete(termo.trim()).pipe(catchError(() => of([])))
        : of([]))
    ).subscribe(resultados => {
      const indiceAtual = this.contatosArray.controls.indexOf(contatoForm);
      if (indiceAtual >= 0) this.opcoesAutocomplete[indiceAtual] = resultados;
      this.cdr.detectChanges();
    });
    this.formSubs.push(sub);
  }

  alternarBuscaContato(index: number, buscar: boolean): void {
    const grupo = this.contatosArray.at(index) as FormGroup;
    grupo.get('buscarExistente')?.setValue(buscar, { emitEvent: false });
    if (!buscar) {
      grupo.get('id')?.setValue(null);
      grupo.get('busca')?.setValue('');
      grupo.patchValue({ nomeCompleto: '', telefone: '', email: '', endereco: '', cpf: '', localTrabalho: '' }, { emitEvent: false });
      this.opcoesAutocomplete[index] = [];
    }
    for (const campo of ['nomeCompleto', 'telefone', 'email', 'endereco', 'cpf', 'localTrabalho']) {
      const controle = grupo.get(campo)!;
      if (buscar) controle.disable({ emitEvent: false });
      else controle.enable({ emitEvent: false });
    }
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
      endereco: contato.endereco,
      cpf: contato.cpf || '',
      localTrabalho: contato.localTrabalho || ''
    }, { emitEvent: false });

    this.opcoesAutocomplete[index] = [];
    formGroup.get('busca')?.setValue(contato.nomeCompleto, { emitEvent: false });
    this.alternarBuscaContato(index, true);
  }

  // Validações e Máscaras
  verificarErros() {
    this.erros = mapearErrosFormulario(this.formUsuario);
  }

  aplicarMascaraCpf(event: Event) {
    const input = event.target as HTMLInputElement;
    this.formUsuario.get('cpf')?.setValue(formatarCpf(input.value));
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

  formatarUnidadeTurmaTabela(usuario: UsuarioResponseDTO): string {
    const nomeTurma = usuario.nomeTurma?.trim();
    const unidade = usuario.nomeUnidade?.trim() || this.extrairUnidadeDaTurma(nomeTurma);
    const turma = this.formatarPeriodoTabela(usuario.periodo || nomeTurma);

    if (unidade && turma) return `${unidade} - ${turma}`;
    if (unidade) return unidade;
    if (turma) return turma;
    return '-';
  }

  private formatarPeriodoTabela(valor?: string | null): string {
    if (!valor) return '';

    const texto = valor.toString().replace(/\(.*?\)/g, '').trim();
    const normalizado = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (normalizado.includes('MANHA')) return 'Manhã';
    if (normalizado.includes('TARDE')) return 'Tarde';

    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  private extrairUnidadeDaTurma(nomeTurma?: string | null): string {
    if (!nomeTurma || !nomeTurma.includes('-')) return '';

    const [possivelUnidade] = nomeTurma.split('-');
    const unidade = possivelUnidade.replace(/\(.*?\)/g, '').trim();
    const normalizada = unidade
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (!unidade || normalizada.includes('MANHA') || normalizada.includes('TARDE')) {
      return '';
    }

    return unidade;
  }

  private verificarCpfCadastradoDinamicamente(): void {
    if (this.formUsuario.get('usarOutroDocumento')?.value) {
      this.limparErroCpfDuplicado();
      return;
    }

    const cpf = this.formUsuario.get('cpf')?.value?.replace(/\D/g, '') || '';
    if (cpf.length !== 11) {
      this.limparErroCpfDuplicado();
      return;
    }

    if (this.todosUsuarios.length) {
      this.aplicarValidacaoCpfDuplicado(cpf);
      return;
    }

    this.usuarioService.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.todosUsuarios = usuarios.filter(u => u.status !== 'EXCLUIDO');
        this.aplicarValidacaoCpfDuplicado(cpf);
      },
      error: () => {}
    });
  }

  private aplicarValidacaoCpfDuplicado(cpf: string): void {
    const duplicado = this.todosUsuarios.some(usuario => {
      const cpfUsuario = usuario.cpf?.replace(/\D/g, '');
      const mesmoUsuarioEmEdicao = this.modoEdicao && usuario.id === this.usuarioSelecionadoId;
      return cpfUsuario === cpf && !mesmoUsuarioEmEdicao;
    });

    if (!duplicado) {
      this.limparErroCpfDuplicado();
      return;
    }

    const cpfCtrl = this.formUsuario.get('cpf');
    cpfCtrl?.setErrors({ ...(cpfCtrl.errors || {}), cpfDuplicado: true });
    this.erros['cpf'] = this.mensagemCpfDuplicado;
  }

  private limparErroCpfDuplicado(): void {
    const cpfCtrl = this.formUsuario.get('cpf');
    if (!cpfCtrl?.errors?.['cpfDuplicado']) {
      if (this.erros['cpf'] === this.mensagemCpfDuplicado) delete this.erros['cpf'];
      return;
    }

    const { cpfDuplicado, ...outrosErros } = cpfCtrl.errors;
    cpfCtrl.setErrors(Object.keys(outrosErros).length ? outrosErros : null);

    if (this.erros['cpf'] === this.mensagemCpfDuplicado) {
      delete this.erros['cpf'];
    }
  }

  fotoValida(): boolean {
    return !!this.fotoSelecionada || !!this.fotoPreviewUrl;
  }

  nomeVinculo(vinculo: UsuarioVinculadoDTO): string {
    return vinculo.nomeUsuario || 'Usuário vinculado';
  }

  idUsuarioVinculo(vinculo: UsuarioVinculadoDTO): number | null {
    return vinculo.idUsuario ?? null;
  }

  private tratarErroSalvarUsuario(err: any, mensagemPadrao: string): void {
    const msgErro = err.error?.message || err.error?.detail || mensagemPadrao;
    const msgNormalizada = msgErro.toString().toLowerCase();

    if (msgNormalizada.includes('matrícula ativa') || msgNormalizada.includes('matricula ativa') || msgNormalizada.includes('cpf')) {
      const campoDocumento = this.formUsuario.get('usarOutroDocumento')?.value ? 'documentoAuxiliar' : 'cpf';
      this.erros[campoDocumento] = msgErro;
      this.etapaModal = 1;
      this.formUsuario.get(campoDocumento)?.markAsTouched();
    }

    this.toastr.error(msgErro, 'Erro');
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

    for (let i = 0; i < this.contatosArray.length; i++) {
      (this.contatosArray.at(i) as FormGroup).markAllAsTouched();
    }

    if (this.formUsuario.invalid || !this.formUsuario.get('idTurma')?.value || this.contatosArray.controls.some(c => c.get('buscarExistente')?.value && !c.get('id')?.value)) {
      this.toastr.error('Verifique os campos obrigatórios do cadastro.', 'Atenção');
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

    const socio = dados.socioeconomico;
    const complemento = dados.complementares;
    const fichaSocioeconomica = {
      ...Object.fromEntries(Object.entries(socio).filter(([chave]) => chave !== 'composicaoFamiliar')),
      ...Object.fromEntries(Object.entries(complemento).filter(([chave]) => chave !== 'outraReligiao' && chave !== 'professaReligiao')),
      religiao: complemento.religiao === 'Outra' ? complemento.outraReligiao : complemento.religiao
    };
    const dto: CadastroUsuarioCompletoDTO = {
      nomeCompleto: dados.nomeCompleto,
      dataNascimento: dados.dataNascimento,
      cpf: dados.usarOutroDocumento ? null : dados.cpf?.replace(/\D/g, ''),
      documentoAuxiliar: dados.usarOutroDocumento ? dados.documentoAuxiliar : null,
      tipoDocumento: dados.usarOutroDocumento ? dados.tipoDocumento : null,
      cadUnico: dados.cadUnico, endereco: dados.endereco, bairro: dados.bairro,
      cep: dados.cep, escola: dados.escola, periodoEscolar: dados.periodoEscolar,
      serieEscolar: dados.serieEscolar, raEscolar: dados.raEscolar,
      idTurma: dados.idTurma, composicaoFamiliar: socio.composicaoFamiliar,
      fichaSocioeconomica: fichaSocioeconomica as CadastroUsuarioCompletoDTO['fichaSocioeconomica'],
      contatos: (dados.contatos as any[]).map(c => ({
        id: c.id, nomeCompleto: c.nomeCompleto,
        telefone: c.telefone?.replace(/\D/g, ''), email: c.email,
        endereco: c.endereco, cpf: c.cpf?.replace(/\D/g, ''),
        localTrabalho: c.localTrabalho, parentesco: c.parentesco, principal: c.principal
      }))
    };

    if (this.modoEdicao) {
      const dtoEdicao: Partial<CadastroUsuarioCompletoDTO> = { ...dto };
      delete dtoEdicao.composicaoFamiliar;
      delete dtoEdicao.fichaSocioeconomica;
      this.usuarioService.atualizar(this.usuarioSelecionadoId!, dtoEdicao).subscribe({
        next: () => {
          this.processarUploadFoto(this.usuarioSelecionadoId!, 'Usuário atualizado com sucesso!');
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.tratarErroSalvarUsuario(err, 'Erro ao atualizar usuário.');
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
            this.tratarErroSalvarUsuario(err, 'Erro ao cadastrar usuário.');
            this.cdr.detectChanges();
          });
        }
      });
    }
  }

  processarUploadFoto(idUsuario: number, mensagemSucesso: string): void {
    const uploads = [
      ...(this.fotoSelecionada ? [this.usuarioService.atualizarFotoPerfil(idUsuario, this.fotoSelecionada)] : []),
      ...this.arquivosSaude.map(arquivo => this.usuarioService.uploadArquivoSaude(idUsuario, arquivo))
    ];
    if (!uploads.length) {
      this.concluirCadastro(mensagemSucesso);
      return;
    }
    forkJoin(uploads).subscribe({
      next: () => this.concluirCadastro(mensagemSucesso),
      error: () => this.concluirCadastro('Usuário salvo, mas houve erro no envio de um ou mais anexos.', true)
    });
  }

  private concluirCadastro(mensagem: string, aviso = false): void {
    this.ngZone.run(() => {
      this.isLoading = false;
      if (aviso) this.toastr.warning(mensagem, 'Aviso');
      else this.toastr.success(mensagem, 'Sucesso');
      this.fecharModalSemConfirmacao();
      this.todosUsuarios = [];
      this.carregarUsuarios();
    });
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

  excluirUsuario(usuario: UsuarioResponseDTO) {
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
          this.vinculosDoContato = (detalhe.vinculos || []).filter(v => v.idUnidade != null);
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

    if (vinculo.principal) {
      this.toastr.warning('Vínculo principal não pode ser removido. Altere o contato principal do usuário e tente novamente.', 'Atenção');
      return;
    }

    const idUsuario = this.idUsuarioVinculo(vinculo);
    if (!idUsuario) {
      this.toastr.error('Não foi possível identificar o usuário vinculado a este contato.', 'Erro');
      return;
    }

    Alertas.confirmarExclusao().then(confirmado => {
      if (!confirmado || !this.contatoSelecionado) return;

      this.usuarioService.desvincularContato(idUsuario, this.contatoSelecionado.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toastr.success('Vínculo removido com sucesso!', 'Sucesso');
            this.vinculosDoContato = this.vinculosDoContato.filter(v => this.idUsuarioVinculo(v) !== idUsuario);
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
    if (!this.podeGerenciarContatos || !contato) return;

    this.contatoSelecionado = contato;
    this.modalVinculosAberto = false;
    this.turmasDoVinculo = [];
    this.usuariosParaVinculo = [];
    this.usuarioSelecionadoParaVinculo = null;
    this.formNovoVinculo.reset({ idUnidade: null, idTurma: null, idUsuario: null, usuarioBusca: '', parentesco: '', principal: false });
    this.formNovoVinculo.get('idTurma')?.disable();
    this.formNovoVinculo.get('idUsuario')?.disable();
    this.formNovoVinculo.get('usuarioBusca')?.disable();
    this.modalNovoVinculoAberto = true;

    this.buscaVinculoSub?.unsubscribe();
    this.buscaVinculoSub = this.formNovoVinculo.get('usuarioBusca')!.valueChanges.pipe(
      debounceTime(400), distinctUntilChanged(),
      switchMap(termo => {
        const unidadeId = this.formNovoVinculo.get('idUnidade')?.value;
        this.formNovoVinculo.get('idUsuario')?.setValue(null, { emitEvent: false });
        return unidadeId && typeof termo === 'string' && termo.trim().length >= 2
          ? this.usuarioService.buscarAutocomplete(termo.trim(), unidadeId).pipe(catchError(() => of([])))
          : of([]);
      })
    ).subscribe(usuarios => {
      const turmaId = this.formNovoVinculo.get('idTurma')?.value;
      this.usuariosParaVinculo = usuarios.filter(u => u.idTurma === turmaId && u.status !== 'EXCLUIDO');
      this.cdr.detectChanges();
    });
  }

  onUnidadeVinculoChange(idUnidade: number) {
    const turmaCtrl = this.formNovoVinculo.get('idTurma');
    const usuarioBuscaCtrl = this.formNovoVinculo.get('usuarioBusca');

    turmaCtrl?.setValue(null);
    this.formNovoVinculo.get('idUsuario')?.setValue(null);
    usuarioBuscaCtrl?.setValue('');
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
    const usuarioBuscaCtrl = this.formNovoVinculo.get('usuarioBusca');

    this.formNovoVinculo.get('idUsuario')?.setValue(null);
    usuarioBuscaCtrl?.setValue('');
    this.usuariosParaVinculo = [];

    if (idTurma) {
      usuarioBuscaCtrl?.enable();
    } else {
      usuarioBuscaCtrl?.disable();
    }
  }

  get opcoesUsuarioVinculo(): UsuarioResponseDTO[] {
    const termo = (this.formNovoVinculo.get('usuarioBusca')?.value || '').toString().trim().toLowerCase();
    if (termo.length < 2) return [];
    return this.usuariosParaVinculo.filter(u => u.nomeCompleto.toLowerCase().includes(termo));
  }

  displayUsuarioVinculo(usuario: UsuarioResponseDTO | string | null): string {
    return typeof usuario === 'string' ? usuario : usuario?.nomeCompleto || '';
  }

  selecionarUsuarioVinculo(usuario: UsuarioResponseDTO) {
    this.formNovoVinculo.patchValue({ idUsuario: usuario.id, usuarioBusca: usuario.nomeCompleto }, { emitEvent: false });
    this.usuarioSelecionadoParaVinculo = null;

    this.usuarioService.buscarPorId(usuario.id).subscribe(dadosCompletos => {
      this.usuarioSelecionadoParaVinculo = dadosCompletos;
    });
  }

  private resolverUsuarioSelecionadoParaVinculo(
    idUsuario: number | null | undefined,
    usuarioBusca: string | null | undefined
  ): UsuarioResponseDTO | null {
    if (idUsuario) {
      return this.usuariosParaVinculo.find(u => u.id === idUsuario) || null;
    }

    const termo = (usuarioBusca || '').trim().toLowerCase();
    if (!termo) return null;

    return this.usuariosParaVinculo.find(u => u.nomeCompleto.trim().toLowerCase() === termo) || null;
  }

  fecharNovoVinculo() {
    this.buscaVinculoSub?.unsubscribe();
    this.modalNovoVinculoAberto = false;
    this.contatoSelecionado = null;
    this.usuarioSelecionadoParaVinculo = null;
  }

  /** Carrega a lista de usuários (uma vez) para alimentar o passo "Usuário" do vínculo. */
  private garantirUsuariosCarregados() {
    if (this.todosUsuarios.length > 0) {
      this.atualizarUsuariosParaVinculo(this.formNovoVinculo.get('idTurma')?.value);
      return;
    }

    this.usuarioService.listarUsuarios().subscribe(resposta => {
      this.todosUsuarios = resposta.filter(u => u.status !== 'EXCLUIDO');
      this.atualizarUsuariosParaVinculo(this.formNovoVinculo.get('idTurma')?.value);
    });
  }

  private atualizarUsuariosParaVinculo(idTurma: number | null | undefined) {
    this.usuariosParaVinculo = idTurma
      ? this.todosUsuarios.filter(u => u.idTurma === idTurma)
      : [];
  }

  async salvarNovoVinculo() {
    this.formNovoVinculo.markAllAsTouched();

    if (!this.contatoSelecionado) {
      this.toastr.warning('Selecione um contato.', 'Atenção');
      return;
    }

    const dados = this.formNovoVinculo.getRawValue();

    if (!dados.parentesco) {
      this.toastr.warning('Selecione o parentesco.', 'Atenção');
      return;
    }

    if (!dados.idUnidade) {
      this.toastr.warning('Selecione a unidade.', 'Atenção');
      return;
    }

    if (!dados.idTurma) {
      this.toastr.warning('Selecione a turma.', 'Atenção');
      return;
    }

    const usuarioSelecionado = this.resolverUsuarioSelecionadoParaVinculo(dados.idUsuario, dados.usuarioBusca);

    if (!usuarioSelecionado) {
      this.toastr.warning('Selecione um usuário.', 'Atenção');
      return;
    }

    this.formNovoVinculo.get('idUsuario')?.setValue(usuarioSelecionado.id, { emitEvent: false });

    const jaTemPrincipal = (this.usuarioSelecionadoParaVinculo?.contatos || []).some((c: any) => c.principal);
    if (dados.principal && jaTemPrincipal) {
      const confirmou = await Alertas.confirmarSubstituirContatoPrincipal();
      if (!confirmou) return;
    }

    this.isSalvandoVinculo = true;

    this.usuarioService.vincularContatoExistente(usuarioSelecionado.id, this.contatoSelecionado.id, {
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
