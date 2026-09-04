import {
  ChangeDetectorRef,
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ToastrService } from 'ngx-toastr';

import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaAcao,
  TabelaColuna,
  TabelaLayout
} from '@components/tabela-layout/tabela-layout';

import { Paginacao } from '@components/paginacao/paginacao';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import { AtualizarColaboradorDTO, Colaborador, CriarColaboradorDTO } from 'src/app/shared/models/colaborador.model';
import { ColaboradorService } from 'src/app/shared/services/colaborador/colaborador.service';
import { PapelService } from 'src/app/shared/services/colaborador/papel.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import {
  CampoOrdenacao,
  alternarOrdenacao,
  analisarOrdenacao,
  lerParametrosPagina
} from 'src/app/shared/utils/paginacao-url';
import {
  formatarCpf,
  formatarTelefone
} from 'src/app/shared/utils/masks';

type Papel = {
  id: number;
  nome?: string;
  nomePapel?: string;
};

@Component({
  selector: 'app-colaborador',
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
    MatSelectModule
  ],
  templateUrl: './colaborador.component.html',
  styleUrls: ['./colaborador.component.css']
})
export class ColaboradorComponent
  implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  colaboradores: Colaborador[] = [];
  papeis: Papel[] = [];
  filtroPapel: number | '' = '';

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
  colaboradorSelecionadoId: number | null = null;
  formColaborador: FormGroup;
  erros: { [key: string]: string } = {};
  mostrarSenha = false;
  mostrarConfirmarSenha = false;
  isLoading = false;
  modalTremendo = false;
  valoresOriginaisDoFormulario: any = null;

  private readonly senhaRegex =
    /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

  private readonly mensagensCustomizadas:
    Record<string, Record<string, string>> = {
    senha: {
      pattern:
        'A senha não contem os requisitos minimos.'
    },
    confirmarSenha: {
      senhasDiferentes:
        'As senhas não coincidem.'
    },
    cpf: {
      minlength: 'CPF incompleto.',
      maxlength: 'CPF incompleto.'
    },
    telefone: {
      minlength: 'Telefone incompleto.',
      maxlength: 'Telefone incompleto.'
    }
  };

  colunas: TabelaColuna<Colaborador>[] = [
    {
      chave: 'nomeCompleto',
      titulo: 'Nome',
      principalMobile: true,
      ordenavel: true
    },
    {
      chave: 'email',
      titulo: 'E-mail',
      ordenavel: true
    },
    {
      chave: 'cpf',
      titulo: 'CPF',
      ordenavel: true
    },
    {
      chave: 'nomePapel',
      titulo: 'Papel',
      ordenavel: true,
      campoOrdenacao: 'papel.nomePapel'
    }
  ];

  acoesTabela: TabelaAcao<Colaborador>[] = [
    {
      icone: 'edit',
      tooltip: 'Editar',
      acao: 'editar'
    },
    {
      icone: 'delete',
      tooltip: 'Excluir',
      acao: 'excluir'
    }
  ];

  constructor(
    private colaboradorService: ColaboradorService,
    private papelService: PapelService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.formColaborador = this.fb.group({
      nomeCompleto: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(60)
        ]
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.minLength(5),
          Validators.maxLength(100)
        ]
      ],
      senha: [''],
      confirmarSenha: [''],
      cpf: [
        '',
        [
          Validators.required,
          Validators.minLength(14),
          Validators.maxLength(14)
        ]
      ],
      endereco: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(150)
        ]
      ],
      telefone: [
        '',
        [
          Validators.required,
          Validators.minLength(14),
          Validators.maxLength(15)
        ]
      ],
      idPapel: [
        '',
        Validators.required
      ]
    });
  }

  ngOnInit(): void {
    this.carregarPapeis();

    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);

      const papelBruto = Number(params.get('papel'));
      this.filtroPapel = Number.isFinite(papelBruto) && papelBruto > 0 ? papelBruto : '';

      this.carregarColaboradores();
    });

    this.formColaborador
      .get('senha')
      ?.valueChanges
      .subscribe(() => this.checarSenhasIguais());

    this.formColaborador
      .get('confirmarSenha')
      ?.valueChanges
      .subscribe(() => this.checarSenhasIguais());
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  get mensagemVazia(): string {
    const papelSelecionado = this.papeis.find(p => p.id === this.filtroPapel);
    return papelSelecionado
      ? `Nenhum colaborador com o papel ${this.obterNomePapel(papelSelecionado)} cadastrado ainda`
      : 'Nenhum colaborador cadastrado ainda';
  }

  get temAlteracoes(): boolean {
    if (!this.modoEdicao) {
      return this.formColaborador.dirty;
    }

    return (
      JSON.stringify(this.formColaborador.getRawValue()) !==
      JSON.stringify(this.valoresOriginaisDoFormulario)
    );
  }

  carregarPapeis(): void {
    this.papelService
      .listarTodos()
      .subscribe({
        next: (dados: Papel[]) => {
          this.papeis = dados;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(
            'Erro ao carregar papéis da API:',
            err
          );
        }
      });
  }

  carregarColaboradores(): void {
    if (this.carregandoLista) {
      return;
    }

    this.carregandoLista = true;
    this.erroLista = false;

    const idPapel = this.filtroPapel || undefined;

    this.colaboradorService
      .listarTodos(this.pagina, this.tamanho, this.sort, idPapel)
      .subscribe({
        next: (resposta) => {

          this.ngZone.run(() => {

            this.colaboradores = [...resposta.content];
            this.totalElementos = resposta.page.totalElements;
            this.totalPaginas = resposta.page.totalPages;
            this.carregandoLista = false;

            if (this.colaboradores.length === 0 && this.pagina > 0) {
              this.irParaPagina(Math.max(0, resposta.page.totalPages - 1));
              return;
            }

            this.cdr.detectChanges();
          });
        },

        error: (err: any) => {

          console.error(
            'Erro na API:',
            err
          );

          this.carregandoLista = false;
          this.erroLista = true;

          this.toastr.error(
            'Não foi possivel carregar a lista de usuarios.',
            'Erro'
          );

          this.cdr.detectChanges();
        }
      });
  }

  aplicarFiltro(): void {
    this.navegar({ page: 0, papel: this.filtroPapel || null });
  }

  irParaPagina(pagina: number): void {
    this.navegar({ page: pagina });
  }

  mudarTamanhoPagina(tamanho: number): void {
    this.navegar({ page: 0, size: tamanho });
  }

  ordenarPor(campo: string): void {
    this.navegar({ page: 0, sort: alternarOrdenacao(this.ordenacao, campo) });
  }

  private navegar(queryParams: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  abrirCadastro(): void {
    this.modoEdicao = false;
    this.colaboradorSelecionadoId = null;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;
    this.modalTremendo = false;
    this.valoresOriginaisDoFormulario = null;

    this.formColaborador
      .get('senha')
      ?.setValidators([
        Validators.required,
        Validators.pattern(this.senhaRegex),
        Validators.maxLength(50)
      ]);

    this.formColaborador
      .get('confirmarSenha')
      ?.setValidators([
        Validators.required
      ]);

    this.formColaborador.reset({
      nomeCompleto: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      cpf: '',
      endereco: '',
      telefone: '',
      idPapel: ''
    });

    this.atualizarValidadoresSenha();
    this.formColaborador.markAsPristine();
    this.modalAberto = true;
  }

  abrirEdicao(colaborador: Colaborador): void {
    this.modoEdicao = true;
    this.colaboradorSelecionadoId = colaborador.id;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.isLoading = false;
    this.modalTremendo = false;

    this.formColaborador
      .get('senha')
      ?.clearValidators();

    this.formColaborador
      .get('confirmarSenha')
      ?.clearValidators();

    this.formColaborador.reset({
      nomeCompleto: colaborador.nomeCompleto,
      email: colaborador.email,
      senha: '',
      confirmarSenha: '',
      cpf: formatarCpf(colaborador.cpf),
      endereco: colaborador.endereco,
      telefone: formatarTelefone(colaborador.telefone),
      idPapel: colaborador.idPapel
    });

    this.atualizarValidadoresSenha();
    this.formColaborador.markAsPristine();
    this.valoresOriginaisDoFormulario =
      this.formColaborador.getRawValue();
    this.modalAberto = true;
  }

  fecharModal(): void {
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      this.fecharModalSemConfirmacao();
      return;
    }

    Alertas
      .confirmarDescarte()
      .then((confirmado: boolean) => {
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

  formularioTemAlteracoesNaoSalvas(): boolean {
    if (!this.modalAberto) {
      return false;
    }

    return this.temAlteracoes;
  }

  @HostListener(
    'window:beforeunload',
    ['$event']
  )
  avisarAntesDeFechar(
    event: BeforeUnloadEvent
  ): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  verificarErros(): void {
    this.erros =
      mapearErrosFormulario(
        this.formColaborador,
        this.mensagensCustomizadas
      );
  }

  aplicarMascaraCpf(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    this.formColaborador
      .get('cpf')
      ?.setValue(
        formatarCpf(input.value),
        { emitEvent: false }
      );

    this.verificarErros();
  }

  aplicarMascaraTelefone(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    this.formColaborador
      .get('telefone')
      ?.setValue(
        formatarTelefone(input.value),
        { emitEvent: false }
      );

    this.verificarErros();
  }

  alternarVisibilidadeSenha(
    campo: 'senha' | 'confirmarSenha'
  ): void {
    if (campo === 'senha') {
      this.mostrarSenha = !this.mostrarSenha;
      return;
    }

    this.mostrarConfirmarSenha =
      !this.mostrarConfirmarSenha;
  }

  salvar(): void {
    this.formColaborador.markAllAsTouched();
    this.checarSenhasIguais();
    this.verificarErros();

    if (this.formColaborador.invalid) {
      return;
    }

    if (
      this.modoEdicao &&
      !this.temAlteracoes
    ) {
      this.toastr.info(
        'Nenhum dado foi alterado.',
        'Aviso'
      );
      return;
    }

    this.isLoading = true;

    if (this.modoEdicao) {
      this.atualizarColaborador();
      return;
    }

    this.criarColaborador();
  }

  executarAcao(
    evento: {
      tipo: string;
      linha: Colaborador;
    }
  ): void {
    if (evento.tipo === 'editar') {
      this.abrirEdicao(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir') {
      this.deletarColaborador(evento.linha);
    }
  }

  deletarColaborador(
    colaborador: Colaborador
  ): void {
    Alertas
      .confirmarExclusao()
      .then((confirmado: boolean) => {
        if (!confirmado) {
          return;
        }

        this.isLoading = true;

        this.colaboradorService
          .deletar(colaborador.id)
          .subscribe({
            next: () => {
              this.isLoading = false;
              this.carregarColaboradores();
              this.toastr.success(
                'Usuario excluido com sucesso.',
                'Sucesso'
              );
            },
            error: () => {
              this.isLoading = false;
              this.toastr.error(
                'Erro ao excluir colaborador.',
                'Erro'
              );
              this.cdr.detectChanges();
            }
          });
      });
  }

  obterNomePapel(papel: Papel): string {
    return papel.nomePapel || papel.nome || '';
  }

  private criarColaborador(): void {
    const {
      confirmarSenha,
      ...dadosCadastro
    } = this.formColaborador.value;

    const dto: CriarColaboradorDTO =
      dadosCadastro;

    this.colaboradorService
      .criar(dto)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarColaboradores();
          this.toastr.success(
            'Usuario cadastrado com sucesso.',
            'Sucesso'
          );
        },
        error: (err: any) => {
          this.isLoading = false;
          this.toastr.error(
            err.error?.message ||
            'Erro ao cadastrar colaborador',
            'Erro'
          );
          this.cdr.detectChanges();
        }
      });
  }

  private atualizarColaborador(): void {
    const {
      senha,
      confirmarSenha,
      ...dadosEdicao
    } = this.formColaborador.value;

    const dto: AtualizarColaboradorDTO =
      dadosEdicao;

    this.colaboradorService
      .atualizar(
        this.colaboradorSelecionadoId!,
        dto
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.fecharModalSemConfirmacao();
          this.carregarColaboradores();
          this.toastr.success(
            'Usuario atualizado com sucesso.',
            'Sucesso'
          );
        },
        error: (err: any) => {
          this.isLoading = false;
          this.toastr.error(
            err.error?.message ||
            'Erro ao atualizar colaborador',
            'Erro'
          );
          this.cdr.detectChanges();
        }
      });
  }

  private checarSenhasIguais(): void {
    if (this.modoEdicao) {
      return;
    }

    const senha =
      this.formColaborador.get('senha');

    const confirmarSenha =
      this.formColaborador.get('confirmarSenha');

    if (!senha || !confirmarSenha) {
      return;
    }

    if (
      senha.value &&
      confirmarSenha.value &&
      senha.value !== confirmarSenha.value
    ) {
      confirmarSenha.setErrors({
        ...(confirmarSenha.errors || {}),
        senhasDiferentes: true
      });
      return;
    }

    if (confirmarSenha.hasError('senhasDiferentes')) {
      const {
        senhasDiferentes,
        ...errosRestantes
      } = confirmarSenha.errors || {};

      confirmarSenha.setErrors(
        Object.keys(errosRestantes).length
          ? errosRestantes
          : null
      );
    }
  }

  private atualizarValidadoresSenha(): void {
    this.formColaborador
      .get('senha')
      ?.updateValueAndValidity();

    this.formColaborador
      .get('confirmarSenha')
      ?.updateValueAndValidity();
  }

  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
    this.modalTremendo = false;
    this.isLoading = false;
    this.colaboradorSelecionadoId = null;
    this.erros = {};
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.valoresOriginaisDoFormulario = null;

    this.formColaborador.reset({
      nomeCompleto: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      cpf: '',
      endereco: '',
      telefone: '',
      idPapel: ''
    });

    this.formColaborador.markAsPristine();
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;

    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

}
