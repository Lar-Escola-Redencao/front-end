import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener,
  NgZone
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ToastrService } from 'ngx-toastr';

import {
  mapearErrosFormulario,
  validarImagem
} from 'src/app/shared/utils/form-validations';

import { Alertas } from 'src/app/shared/utils/alerts';

import {
  ComponentComAlteracoesNaoSalvas
} from 'src/app/shared/guards/can-deactivate.guard';

import {
  TabelaLayout,
  TabelaColuna,
  TabelaAcao
} from '@components/tabela-layout/tabela-layout';

import { ModalLayout } from '@components/modal-layout/modal-layout';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { PartnersService } from '../../../../../shared/services/content-management/parceiro/partners.service';

import {
  Partner,
  PartnerInput
} from '../../../../../shared/models/partner.model';

import { environment } from '../../../../../../environments/environment';


@Component({
  selector: 'app-partners-manager',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule
  ],

  templateUrl: './partners-manager.html',
  styleUrl: './partners-manager.css'
})
export class PartnersManager
  implements OnInit, ComponentComAlteracoesNaoSalvas {

  // =========================================================
  // CONSTRUTOR
  // =========================================================

  constructor(
    private fb: FormBuilder,
    private partnersService: PartnersService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {

    this.form = this.fb.group({

      nome: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50)
        ]
      ],

      logo: [
        null,
        [
          Validators.required,
          validarImagem()
        ]
      ],

      ativo: [true]

    });
  }


  // =========================================================
  // CONTROLE GERAL
  // =========================================================

  partners: Partner[] = [];
  apiUrl = environment.apiUrl;
  isLoading = false;
  loadError = false;
  modalAberto = false;
  modoEdicao = false;
  modalTremendo = false;


  // =========================================================
  // TABELA
  // =========================================================

  colunas: TabelaColuna<Partner>[] = [
    {
      chave: 'nome',
      titulo: 'Nome',
      principalMobile: true
    },
    {
      chave: 'logo',
      titulo: 'Logo',
      tipo: 'imagem'
    },
    {
      chave: 'ativo',
      titulo: 'Exibição',
      tipo: 'status'
    }

  ];


  acoesTabela: TabelaAcao<Partner>[] = [
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


  // =========================================================
  // FORMULÁRIO
  // =========================================================

  form: FormGroup;
  erros: { [key: string]: string } = {};
  valoresOriginais: any = null;
  partnerSelecionadoId: number | null = null;


  // =========================================================
  // LOGO
  // =========================================================

  logoSelecionada: File | null = null;
  nomeLogoSelecionada = '';
  logoPreviewUrl: string | null = null;


  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.carregarPartners();
  }

  // =========================================================
  // CARREGAR PARCEIROS
  // =========================================================

  carregarPartners(): void {
    this.isLoading = true;
    this.loadError = false;
    this.partnersService
      .listarTodos()
      .then((dados: Partner[]) => {
        this.partners = dados;
        this.isLoading = false;
        this.cdr.detectChanges();
      })

      .catch(() => {
        this.isLoading = false;
        this.loadError = true;
        this.toastr.error(
          'Erro ao carregar parceiros.',
          'Erro'
        );
        this.cdr.detectChanges();
      });
  }


  // =========================================================
  // ABRIR MODAL
  // =========================================================

  abrirModal(partner?: Partner): void {
    this.modalAberto = true;
    this.isLoading = false;
    this.erros = {};
    this.logoSelecionada = null;
    this.nomeLogoSelecionada = '';
    this.logoPreviewUrl = null;


    // =======================================================
    // EDITAR
    // =======================================================

    if (partner) {
      this.modoEdicao = true;
      this.partnerSelecionadoId = partner.id;

      /*
       * Na edição a logo não é obrigatória,
       * pois o usuário pode manter a logo atual.
       *
       * O validator validarImagem() continua ativo.
       */
      this.form.get('logo')?.removeValidators(
        Validators.required
      );

      this.form.get('logo')?.updateValueAndValidity();

      this.form.reset({
        nome: partner.nome,
        logo: null,
        ativo: partner.ativo ?? true
      });


      /*
       * Mostra a logo que já está cadastrada.
       */
      if (partner.logo) {
        this.logoPreviewUrl =
          `${this.apiUrl}${partner.logo}`;
      }

    }


    // =======================================================
    // NOVO
    // =======================================================

    else {
      this.modoEdicao = false;
      this.partnerSelecionadoId = null;

      /*
       * Para novo parceiro a logo é obrigatória
       * e precisa ser uma imagem válida.
       */
      this.form.get('logo')?.setValidators([
        Validators.required,
        validarImagem()
      ]);
      this.form.get('logo')?.updateValueAndValidity();
      this.form.reset({
        nome: '',
        logo: null,
        ativo: true
      });

    }

    /*
     * O estado atual passa a ser o estado original
     * para o controle de alterações não salvas.
     */
    this.form.markAsPristine();
    this.valoresOriginais =
    this.form.getRawValue();
    this.cdr.detectChanges();
  }


  // =========================================================
  // FECHAR MODAL
  // =========================================================

  fecharModal(): void {
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      this.fecharModalSemConfirmacao();
      return;
    }


    Alertas.confirmarDescarte()
      .then((confirmado) => {
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
    this.isLoading = false;
    this.modalAberto = false;
    this.modalTremendo = false;
    this.partnerSelecionadoId = null;
    this.logoSelecionada = null;
    this.nomeLogoSelecionada = '';
    this.logoPreviewUrl = null;
    this.erros = {};

    this.form.reset({
      nome: '',
      logo: null,
      ativo: true
    });


    /*
     * Garante que o formulário volte ao estado
     * de criação, com logo obrigatória.
     */
    this.form.get('logo')?.setValidators([
      Validators.required,
      validarImagem()
    ]);
    this.form.get('logo')?.updateValueAndValidity();
    this.form.markAsPristine();
  }


  private dispararTremorModal(): void {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }


  // =========================================================
  // ALTERAÇÕES NÃO SALVAS
  // =========================================================

  get temAlteracoes(): boolean {
    // -------------------------------------------------------
    // NOVO PARCEIRO
    // -------------------------------------------------------

    if (!this.modoEdicao) {
      return (
        this.form.dirty ||
        this.logoSelecionada !== null
      );
    }

    // -------------------------------------------------------
    // EDIÇÃO
    // -------------------------------------------------------
    /*
     * Se uma nova logo foi selecionada,
     * houve alteração.
     */
    if (this.logoSelecionada !== null) {
      return true;
    }


    const valorAtual = {
      nome:
        this.form.get('nome')?.value,
      ativo:
        this.form.get('ativo')?.value
    };


    const valorOriginal = {
      nome:
        this.valoresOriginais?.nome,
      ativo:
        this.valoresOriginais?.ativo
    };

    return (
      JSON.stringify(valorAtual) !==
      JSON.stringify(valorOriginal)
    );
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


  // =========================================================
  // VALIDAÇÃO
  // =========================================================

  verificarErros(): void {
    this.erros =
      mapearErrosFormulario(this.form);
  }


  // =========================================================
  // SELECIONAR LOGO
  // =========================================================

  selecionarLogo(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    const arquivo =
      input.files?.[0];


    if (!arquivo) {
      return;
    }


    // =======================================================
    // COLOCA O ARQUIVO NO FORMULÁRIO
    // =======================================================

    const logoControl =
      this.form.get('logo');

    logoControl?.setValue(arquivo);
    logoControl?.markAsDirty();
    logoControl?.updateValueAndValidity();

    this.form.markAsDirty();


    // =======================================================
    // ATUALIZA AS MENSAGENS DE ERRO
    // =======================================================

    this.verificarErros();


    // =======================================================
    // ARQUIVO INVÁLIDO
    // =======================================================

    if (logoControl?.invalid) {

      /*
      * Remove qualquer seleção anterior.
      */
      this.logoSelecionada = null;

      this.nomeLogoSelecionada = '';

      /*
      * Remove o preview da logo.
      */
      this.logoPreviewUrl = null;

      /*
      * Limpa o valor do input type=file.
      */
      input.value = '';

      /*
      * Garante que o erro seja exibido.
      */
      logoControl.markAsTouched();
      logoControl.markAsDirty();

      this.verificarErros();

      this.cdr.detectChanges();

      return;
    }


    // =======================================================
    // ARQUIVO VÁLIDO
    // =======================================================

    this.logoSelecionada =
      arquivo;

    this.nomeLogoSelecionada =
      arquivo.name;


    // =======================================================
    // PREVIEW
    // =======================================================

    this.logoPreviewUrl = null;


    const reader =
      new FileReader();


    reader.onload = () => {

      this.logoPreviewUrl =
        reader.result as string;

      this.cdr.detectChanges();

    };


    reader.readAsDataURL(arquivo);

  }

  // =========================================================
  // SALVAR PARCEIRO
  // =========================================================

  salvarParceiro(): void {

    this.form.markAllAsTouched();

    this.verificarErros();


    if (this.form.invalid) {

      return;

    }


    // -------------------------------------------------------
    // VERIFICA SE HOUVE ALTERAÇÃO
    // -------------------------------------------------------

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


    const input: PartnerInput = {

      nome:
        this.form.get('nome')?.value,

      logo:
        this.logoSelecionada,

      ativo:
        this.form.get('ativo')?.value

    };


    // =======================================================
    // ATUALIZAR
    // =======================================================

    if (this.modoEdicao) {

      this.partnersService

        .update(
          this.partnerSelecionadoId!,
          input
        )

        .then(() => {

          this.toastr.success(
            'Parceiro atualizado com sucesso.',
            'Sucesso'
          );


          this.fecharModalSemConfirmacao();

          this.carregarPartners();

        })

        .catch((err: any) => {

          this.isLoading = false;

          this.toastr.error(
            err?.error?.message ||
            'Erro ao atualizar parceiro.',
            'Erro'
          );

          this.cdr.detectChanges();

        });


      return;
    }


    // =======================================================
    // CRIAR
    // =======================================================

    this.partnersService

      .create(input)

      .then(() => {

        this.toastr.success(
          'Parceiro cadastrado com sucesso.',
          'Sucesso'
        );


        this.fecharModalSemConfirmacao();

        this.carregarPartners();

      })

      .catch((err: any) => {

        this.isLoading = false;

        this.toastr.error(
          err?.error?.message ||
          'Erro ao cadastrar parceiro.',
          'Erro'
        );

        this.cdr.detectChanges();

      });

  }


  // =========================================================
  // AÇÕES DA TABELA
  // =========================================================

  executarAcao(
    evento: {
      tipo: string;
      linha: Partner;
    }
  ): void {

    if (evento.tipo === 'editar') {

      this.abrirModal(evento.linha);

      return;

    }


    if (evento.tipo === 'excluir') {

      this.excluirParceiro(
        evento.linha
      );

    }

  }


  // =========================================================
  // EXCLUIR PARCEIRO
  // =========================================================

  excluirParceiro(
    partner: Partner
  ): void {

    Alertas.confirmarExclusao()

      .then((confirmado) => {

        if (!confirmado) {

          return;

        }


        this.isLoading = true;


        this.partnersService

          .delete(partner.id)

          .then(() => {

            this.toastr.success(
              'Parceiro excluído com sucesso.',
              'Sucesso'
            );


            this.isLoading = false;

            this.carregarPartners();

            this.cdr.detectChanges();

          })

          .catch((err: any) => {

            this.isLoading = false;

            this.toastr.error(
              err?.error?.message ||
              'Erro ao excluir parceiro.',
              'Erro'
            );

            this.cdr.detectChanges();

          });

      });

  }

}