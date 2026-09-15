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
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastrService } from 'ngx-toastr';

import { ModalLayout } from '@components/modal-layout/modal-layout';

import {
  TabelaAcao,
  TabelaColuna,
  TabelaLayout
} from '@components/tabela-layout/tabela-layout';

import { Paginacao } from '@components/paginacao/paginacao';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';

import {
  SocialLink,
  SocialLinkInput
} from 'src/app/shared/models/social-link.model';

import { SocialLinksService } from '../../../../../shared/services/content-management/redes-sociais/social-links.service';

import {
  mapearErrosFormulario,
  validarImagem
} from 'src/app/shared/utils/form-validations';

import {
  CampoOrdenacao,
  alternarOrdenacao,
  analisarOrdenacao,
  lerParametrosPagina
} from 'src/app/shared/utils/paginacao-url';

import { Alertas } from 'src/app/shared/utils/alerts';

import { environment } from 'src/environments/environment';

const URL_PATTERN = /^https?:\/\/.+/i;

@Component({
  selector: 'app-social-links-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    Paginacao,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './social-links-manager.html',
  styleUrls: ['./social-links-manager.css']
})
export class SocialLinksManager
  implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {

  socialLinks: SocialLink[] = [];

  apiUrl = environment.apiUrl;

  /**
   * Loading somente da lista.
   */
  isLoadingLista = false;

  /**
   * Loading somente do salvar/editar.
   */
  isSalvando = false;

  loadError = false;

  modalAberto = false;

  modoEdicao = false;

  modalTremendo = false;

  pagina = 0;
  tamanho = 10;
  sort: string | undefined;
  ordenacao: CampoOrdenacao | null = null;
  totalElementos = 0;
  totalPaginas = 0;

  private routeSub?: Subscription;

  colunas: TabelaColuna<SocialLink>[] = [
    {
      chave: 'nome',
      titulo: 'Nome',
      principalMobile: true,
      ordenavel: true
    },
    {
      chave: 'url',
      titulo: 'Link'
    },
    {
      chave: 'ativo',
      titulo: 'Exibição',
      tipo: 'status',
      ordenavel: true
    }
  ];

  acoesTabela: TabelaAcao<SocialLink>[] = [
    {
      icone: 'edit',
      tooltip: 'Editar',
      acao: 'editar'
    }
  ];

  form: FormGroup;

  erros: { [key: string]: string } = {};

  valoresOriginais: any = null;

  socialLinkSelecionadoId: number | null = null;

  iconeSelecionado: File | null = null;

  nomeIconeSelecionado = '';

  iconePreviewUrl: string | null = null;

  private readonly mensagensCustomizadas = {
    url: {
      pattern:
        'Informe um link valido iniciando com http:// ou https://.'
    }
  };

  constructor(
    private fb: FormBuilder,
    private socialLinksService: SocialLinksService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      nome: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],

      url: [
        '',
        [
          Validators.required,
          Validators.pattern(URL_PATTERN),
          Validators.maxLength(255)
        ]
      ],

      icone: [
        null,
        [
          Validators.required,
          validarImagem()
        ]
      ],

      ativo: [true]
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const { pagina, tamanho, sort } = lerParametrosPagina(params);
      this.pagina = pagina;
      this.tamanho = tamanho;
      this.sort = sort;
      this.ordenacao = analisarOrdenacao(sort);
      this.carregarRedesSociais();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  /**
   * Carrega a lista somente quando realmente necessário.
   */
  carregarRedesSociais(): void {
    if (this.isLoadingLista) {
      return;
    }

    this.isLoadingLista = true;
    this.loadError = false;

    this.socialLinksService
      .listarAdmin(this.pagina, this.tamanho, this.sort)
      .then((resposta) => {
        this.ngZone.run(() => {
          this.socialLinks = [...resposta.content];
          this.totalElementos = resposta.page.totalElements;
          this.totalPaginas = resposta.page.totalPages;

          this.isLoadingLista = false;
          this.loadError = false;

          if (this.socialLinks.length === 0 && this.pagina > 0) {
            this.irParaPagina(Math.max(0, resposta.page.totalPages - 1));
            return;
          }

          this.cdr.detectChanges();
        });
      })
      .catch(() => {
        this.ngZone.run(() => {
          this.isLoadingLista = false;
          this.loadError = true;

          this.toastr.error(
            'Não foi possivel carregar as redes sociais.',
            'Erro'
          );

          this.cdr.detectChanges();
        });
      });
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

  abrirModal(socialLink?: SocialLink): void {
    this.modalAberto = true;

    this.isSalvando = false;

    this.erros = {};

    this.iconeSelecionado = null;

    this.nomeIconeSelecionado = '';

    this.iconePreviewUrl = null;

    if (socialLink) {
      this.modoEdicao = true;

      this.socialLinkSelecionadoId = socialLink.id;

      this.form.get('icone')?.setValidators([
        validarImagem()
      ]);

      this.form.get('icone')?.updateValueAndValidity();

      this.form.reset({
        nome: socialLink.nome,
        url: socialLink.url,
        icone: null,
        ativo: socialLink.ativo ?? true
      });

      if (socialLink.icone) {
        this.iconePreviewUrl =
          `${this.apiUrl}${socialLink.icone}`;

        this.nomeIconeSelecionado =
          socialLink.icone.split('/').pop() ?? '';
      }

    } else {
      this.modoEdicao = false;

      this.socialLinkSelecionadoId = null;

      this.form.get('icone')?.setValidators([
        Validators.required,
        validarImagem()
      ]);

      this.form.get('icone')?.updateValueAndValidity();

      this.form.reset({
        nome: '',
        url: '',
        icone: null,
        ativo: true
      });
    }

    this.form.markAsPristine();

    this.form.markAsUntouched();

    this.valoresOriginais =
      this.form.getRawValue();

    this.cdr.detectChanges();
  }

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

    this.isSalvando = false;

    this.modalAberto = false;

    this.modoEdicao = false;

    this.modalTremendo = false;

    this.socialLinkSelecionadoId = null;

    this.iconeSelecionado = null;

    this.nomeIconeSelecionado = '';

    this.iconePreviewUrl = null;

    this.erros = {};

    this.form.reset({
      nome: '',
      url: '',
      icone: null,
      ativo: true
    });

    this.form.get('icone')?.setValidators([
      Validators.required,
      validarImagem()
    ]);

    this.form.get('icone')?.updateValueAndValidity();

    this.form.markAsPristine();

    this.form.markAsUntouched();
  }

  private dispararTremorModal(): void {

    this.modalTremendo = true;

    setTimeout(() => {

      this.ngZone.run(() => {

        this.modalTremendo = false;

        this.cdr.detectChanges();

      });

    }, 400);
  }

  get temAlteracoes(): boolean {

    if (!this.modoEdicao) {
      return (
        this.form.dirty ||
        this.iconeSelecionado !== null
      );
    }

    if (this.iconeSelecionado !== null) {
      return true;
    }

    const valorAtual = {
      nome: this.form.get('nome')?.value,
      url: this.form.get('url')?.value,
      ativo: this.form.get('ativo')?.value
    };

    const valorOriginal = {
      nome: this.valoresOriginais?.nome,
      url: this.valoresOriginais?.url,
      ativo: this.valoresOriginais?.ativo
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

  @HostListener('window:beforeunload', ['$event'])
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
        this.form,
        this.mensagensCustomizadas
      );
  }

  selecionarIcone(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    const arquivo =
      input.files?.[0];

    if (!arquivo) {
      return;
    }

    const iconeControl =
      this.form.get('icone');

    iconeControl?.setValue(arquivo);

    iconeControl?.markAsDirty();

    iconeControl?.updateValueAndValidity();

    this.form.markAsDirty();

    this.verificarErros();

    if (iconeControl?.invalid) {

      this.iconeSelecionado = null;

      this.nomeIconeSelecionado = '';

      this.iconePreviewUrl = null;

      input.value = '';

      iconeControl.markAsTouched();

      iconeControl.markAsDirty();

      this.verificarErros();

      this.cdr.detectChanges();

      return;
    }

    this.iconeSelecionado = arquivo;

    this.nomeIconeSelecionado =
      arquivo.name;

    this.iconePreviewUrl = null;

    const reader = new FileReader();

    reader.onload = () => {

      this.ngZone.run(() => {

        this.iconePreviewUrl =
          reader.result as string;

        this.cdr.detectChanges();

      });

    };

    reader.readAsDataURL(arquivo);
  }

  async salvarRedeSocial(): Promise<void> {

    this.form.markAllAsTouched();

    this.verificarErros();

    if (this.form.invalid) {
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

    this.isSalvando = true;

    const input: SocialLinkInput = {
      nome: this.form.get('nome')?.value,
      url: this.form.get('url')?.value,
      icone: this.iconeSelecionado,
      ativo: this.form.get('ativo')?.value
    };

    try {

      if (this.modoEdicao) {

        await this.socialLinksService.update(
          this.socialLinkSelecionadoId!,
          input
        );

        this.toastr.success(
          'Rede social atualizada com sucesso.',
          'Sucesso'
        );

      } else {

        await this.socialLinksService.create(input);

        this.toastr.success(
          'Rede social cadastrada com sucesso.',
          'Sucesso'
        );
      }

      this.fecharModalSemConfirmacao();
      this.carregarRedesSociais();

      this.cdr.detectChanges();

    } catch (err: any) {

      this.isSalvando = false;

      this.toastr.error(
        err?.error?.message ||
        'Não foi possivel salvar a rede social. Tente novamente.',
        'Erro'
      );

      this.cdr.detectChanges();
    }
  }

  executarAcao(
    evento: {
      tipo: string;
      linha: SocialLink;
    }
  ): void {

    if (evento.tipo === 'editar') {

      this.abrirModal(
        evento.linha
      );
    }
  }
}
