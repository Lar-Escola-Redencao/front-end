import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ModalLayout } from '@components/modal-layout/modal-layout';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import {
  SecaoGrupo,
  SecoesGrupoService,
} from 'src/app/shared/services/pagina/secoes-grupo.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import { formatarTelefone } from 'src/app/shared/utils/masks';

import { CaptacaoRecursosConfig, CampoTextoConfig, GrupoSecaoConfig } from './captacao-recursos.config';
import {
  CONTROLE_IMAGEM,
  MENSAGEM_IMAGEM_OBRIGATORIA,
  aplicarMascaraTelefone,
  aplicarMascaraTelefoneOuEmail,
  capitalizar,
  criarFormularioGrupo,
  extrairErrosApi,
  imagemObrigatoriaPendente,
  limiteCaracteres,
  montarDtoGrupo,
  registrarArquivo,
  resolverUrlImagem,
  valoresIniciaisGrupo,
  valoresTextoGrupo,
} from './captacao-recursos.util';

@Component({
  selector: 'app-captacao-recursos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './captacao-recursos.html',
  styleUrl: './captacao-recursos.css',
})
export class CaptacaoRecursos implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {
  @Input({ required: true }) config!: CaptacaoRecursosConfig;

  readonly CONTROLE_IMAGEM = CONTROLE_IMAGEM;
  readonly limiteCaracteres = limiteCaracteres;

  grupoAtivo!: GrupoSecaoConfig;
  form!: FormGroup;

  itens: SecaoGrupo[] = [];
  secaoContato: SecaoGrupo | null = null;
  itemEditando: SecaoGrupo | null = null;

  colunas: TabelaColuna<SecaoGrupo>[] = [];
  acoesTabela: TabelaAcao<SecaoGrupo>[] = [];

  carregando = false;
  erroCarregamento = false;
  modalAberto = false;
  modalTremendo = false;
  salvando = false;
  editandoContato = false;
  tentouSalvar = false;

  erros: Record<string, string> = {};
  arquivoSelecionado: File | null = null;
  previewNovaImagem: string | null = null;
  private valoresOriginais = '';
  private routeSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private secoesGrupoService: SecoesGrupoService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // A aba ativa fica no query param `aba`; mudanças vindas da URL (carga
    // inicial, voltar/avançar do navegador) passam por aqui.
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const aba = params.get('aba');
      const destino =
        this.config.grupos.find((grupo) => grupo.grupo === aba) ?? this.config.grupos[0];
      this.trocarParaGrupo(destino);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.liberarPreviewNovaImagem();
  }

  /** Clique na aba: confirma antes de navegar, então cancelar nem altera a URL. */
  mudarAba(grupo: GrupoSecaoConfig): void {
    if (grupo === this.grupoAtivo) {
      return;
    }

    this.confirmarDescarteSeNecessario((confirmado) => {
      if (confirmado) {
        // Ativa antes de navegar: a emissão do query param cai no `destino === grupoAtivo`.
        this.ativarGrupo(grupo);
        this.navegarParaAba(grupo);
      }
    });
  }

  private navegarParaAba(grupo: GrupoSecaoConfig, substituirHistorico = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: grupo.grupo },
      queryParamsHandling: 'merge',
      replaceUrl: substituirHistorico,
    });
  }

  /**
   * Mudança de aba vinda da URL (carga inicial, voltar/avançar do navegador).
   * Aqui a URL já mudou; se o descarte for recusado, ela volta para a aba atual.
   */
  private trocarParaGrupo(destino: GrupoSecaoConfig): void {
    if (destino === this.grupoAtivo) {
      return;
    }

    this.confirmarDescarteSeNecessario((confirmado) => {
      if (confirmado) {
        this.ativarGrupo(destino);
      } else {
        this.navegarParaAba(this.grupoAtivo, true);
      }
    });
  }

  /** Sem alterações pendentes, segue na hora (síncrono); com alterações, pergunta antes. */
  private confirmarDescarteSeNecessario(continuar: (confirmado: boolean) => void): void {
    if (!this.formularioTemAlteracoesNaoSalvas()) {
      continuar(true);
      return;
    }

    Alertas.confirmarDescarte().then((confirmado) => {
      continuar(confirmado);
      this.cdr.detectChanges();
    });
  }

  private ativarGrupo(grupo: GrupoSecaoConfig): void {
    this.grupoAtivo = grupo;
    this.prepararGrupoAtivo();
  }

  private prepararGrupoAtivo(): void {
    this.form = criarFormularioGrupo(this.fb, this.grupoAtivo);
    this.erros = {};
    // Registros da aba anterior não podem vazar: o id do contato era
    // reaproveitado ao criar um produto, virando PUT em vez de POST.
    this.itens = [];
    this.secaoContato = null;
    this.itemEditando = null;
    this.modalAberto = false;
    this.editandoContato = false;
    this.arquivoSelecionado = null;
    this.liberarPreviewNovaImagem();

    if (this.grupoAtivo.exibicao === 'tabela') {
      this.colunas = this.montarColunas();
      this.acoesTabela = this.montarAcoes();
      this.carregarTabela();
      return;
    }

    this.carregarContato();
  }

  private montarColunas(): TabelaColuna<SecaoGrupo>[] {
    const colunas: TabelaColuna<SecaoGrupo>[] = [];

    if (this.grupoAtivo.imagem) {
      colunas.push({
        chave: 'imagem',
        titulo: this.grupoAtivo.imagem.rotulo,
        tipo: 'imagem',
      });
    }

    colunas.push(
      ...this.grupoAtivo.campos.map((campo, indice) => ({
        chave: campo.campo,
        titulo: campo.rotulo,
        principalMobile: indice === 0,
        formatar: (valor: string | null) =>
          (campo.tipo === 'telefone' ? formatarTelefone(valor) : valor) || '-',
      })),
    );

    if (this.grupoAtivo.controlaAtivo) {
      colunas.push({ chave: 'ativo', titulo: 'Exibição', tipo: 'status' });
    }

    return colunas;
  }

  private montarAcoes(): TabelaAcao<SecaoGrupo>[] {
    const acoes: TabelaAcao<SecaoGrupo>[] = [{ icone: 'edit', tooltip: 'Editar', acao: 'editar' }];

    if (this.grupoAtivo.permiteExcluir !== false) {
      acoes.push({ icone: 'delete', tooltip: 'Excluir', acao: 'excluir' });
    }

    return acoes;
  }

  get ehTabela(): boolean {
    return this.grupoAtivo?.exibicao === 'tabela';
  }

  get ehContato(): boolean {
    return this.grupoAtivo?.exibicao === 'formulario';
  }

  get podeAdicionar(): boolean {
    return (
      this.ehTabela &&
      (!this.grupoAtivo.registroUnico || (!this.carregando && this.itens.length === 0))
    );
  }

  get textoBotaoAdicionar(): string {
    return this.grupoAtivo.registroUnico
      ? `Cadastrar ${this.grupoAtivo.nomeItem}`
      : `Novo ${this.grupoAtivo.nomeItem}`;
  }

  get modoEdicao(): boolean {
    return this.itemEditando !== null;
  }

  get tituloModal(): string {
    return this.modoEdicao ? `Editar ${this.grupoAtivo.nomeItem}` : `Novo ${this.grupoAtivo.nomeItem}`;
  }

  get imagemAtual(): string | null {
    return resolverUrlImagem(this.itemEditando?.imagem);
  }

  get temAlteracoes(): boolean {
    return (
      this.arquivoSelecionado !== null ||
      valoresTextoGrupo(this.grupoAtivo, this.form) !== this.valoresOriginais
    );
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return (this.modalAberto || this.editandoContato) && this.temAlteracoes;
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  carregarTabela(): void {
    this.carregando = true;
    this.erroCarregamento = false;

    this.secoesGrupoService.listarPorGrupo(this.config.idPagina, this.grupoAtivo.grupo).subscribe({
      next: (itens) => {
        this.itens = itens;
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregando = false;
        this.erroCarregamento = true;
        this.toastr.error(`Não foi possível carregar a lista de ${this.grupoAtivo.rotuloAba}.`, 'Erro');
        this.cdr.detectChanges();
      },
    });
  }

  carregarContato(): void {
    this.carregando = true;
    this.erroCarregamento = false;

    this.secoesGrupoService.listarPorGrupo(this.config.idPagina, this.grupoAtivo.grupo).subscribe({
      next: (secoes) => {
        this.carregando = false;
        this.secaoContato = secoes[0] ?? null;
        this.preencherFormularioContato();
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregando = false;
        this.erroCarregamento = true;
        this.toastr.error(`Não foi possível carregar os dados de ${this.grupoAtivo.rotuloAba}.`, 'Erro');
        this.cdr.detectChanges();
      },
    });
  }

  private preencherFormularioContato(): void {
    this.form.reset(valoresIniciaisGrupo(this.grupoAtivo, this.secaoContato));
    this.form.disable();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.erros = {};
    this.editandoContato = false;
    this.valoresOriginais = valoresTextoGrupo(this.grupoAtivo, this.form);
  }

  editarContato(): void {
    this.editandoContato = true;
    this.form.enable();
  }

  cancelarContato(): void {
    this.preencherFormularioContato();
  }

  abrirModal(item?: SecaoGrupo): void {
    this.itemEditando = item ?? null;
    this.modalAberto = true;
    this.modalTremendo = false;
    this.salvando = false;
    this.tentouSalvar = false;
    this.erros = {};
    this.arquivoSelecionado = null;
    this.liberarPreviewNovaImagem();

    this.form.reset(valoresIniciaisGrupo(this.grupoAtivo, this.itemEditando));
    this.form.enable();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.valoresOriginais = valoresTextoGrupo(this.grupoAtivo, this.form);
  }

  fecharModal(): void {
    if (!this.temAlteracoes) {
      this.fecharModalSemConfirmacao();
      return;
    }

    Alertas.confirmarDescarte().then((confirmado) => {
      if (confirmado) {
        this.fecharModalSemConfirmacao();
      } else {
        this.dispararTremorModal();
      }

      this.cdr.detectChanges();
    });
  }

  private fecharModalSemConfirmacao(): void {
    this.modalAberto = false;
    this.modalTremendo = false;
    this.salvando = false;
    this.itemEditando = null;
    this.arquivoSelecionado = null;
    this.liberarPreviewNovaImagem();
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  executarAcao(evento: { tipo: string; linha: SecaoGrupo }): void {
    if (evento.tipo === 'editar') {
      this.abrirModal(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir' && this.grupoAtivo.permiteExcluir !== false) {
      this.excluir(evento.linha);
    }
  }

  private excluir(item: SecaoGrupo): void {
    Alertas.confirmarExclusao().then((confirmado) => {
      if (!confirmado) {
        return;
      }

      this.secoesGrupoService.excluir(item.id).subscribe({
        next: () => {
          this.toastr.success(`${capitalizar(this.grupoAtivo.nomeItem)} excluído com sucesso!`, 'Sucesso');
          this.carregarTabela();
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.message || `Erro ao excluir ${this.grupoAtivo.nomeItem}.`, 'Erro');
        },
      });
    });
  }

  aoDigitar(campo: CampoTextoConfig): void {
    if (campo.tipo === 'telefone') {
      aplicarMascaraTelefone(this.form.get(campo.campo));
      return;
    }

    if (campo.tipo === 'telefoneOuEmail') {
      aplicarMascaraTelefoneOuEmail(this.form.get(campo.campo));
    }
  }

  verificarErros(): void {
    this.erros = mapearErrosFormulario(this.form);

    if (this.tentouSalvar && this.imagemPendente && !this.erros[CONTROLE_IMAGEM]) {
      this.erros[CONTROLE_IMAGEM] = MENSAGEM_IMAGEM_OBRIGATORIA;
    }
  }

  private get imagemPendente(): boolean {
    const imagemSalva = this.modalAberto ? this.itemEditando?.imagem : this.secaoContato?.imagem;
    return imagemObrigatoriaPendente(this.grupoAtivo, imagemSalva, this.arquivoSelecionado);
  }

  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';

    if (!arquivo) {
      return;
    }

    const valido = registrarArquivo(this.form, arquivo);
    this.arquivoSelecionado = valido ? arquivo : null;
    this.liberarPreviewNovaImagem();

    if (valido) {
      this.previewNovaImagem = URL.createObjectURL(arquivo);
    }

    this.verificarErros();
  }

  salvar(): void {
    this.tentouSalvar = true;
    this.form.markAllAsTouched();
    this.verificarErros();

    if (this.form.invalid || this.imagemPendente) {
      return;
    }

    if ((this.modoEdicao || this.editandoContato) && !this.temAlteracoes) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.salvando = true;
    const dto = montarDtoGrupo(this.grupoAtivo, this.form, this.arquivoSelecionado);

    // Contato edita o registro único do grupo; nas tabelas, só há id ao editar
    // um item — criar é sempre POST.
    const id = this.ehContato ? this.secaoContato?.id : this.itemEditando?.id;
    const request = id
      ? this.secoesGrupoService.atualizar(this.config.idPagina, id, dto)
      : this.secoesGrupoService.criar(this.config.idPagina, dto);

    request.subscribe({
      next: (secao) => {
        this.salvando = false;
        this.toastr.success(`${capitalizar(this.grupoAtivo.nomeItem)} salvo com sucesso!`, 'Sucesso');

        if (this.ehContato) {
          this.secaoContato = secao;
          this.preencherFormularioContato();
        } else {
          this.fecharModalSemConfirmacao();
          this.carregarTabela();
        }

        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.salvando = false;
        const { erros, mensagem } = extrairErrosApi(err, this.grupoAtivo);
        this.erros = { ...this.erros, ...erros };

        if (mensagem || !Object.keys(erros).length) {
          this.toastr.error(mensagem || `Erro ao salvar ${this.grupoAtivo.nomeItem}.`, 'Erro');
        }

        this.cdr.detectChanges();
      },
    });
  }

  private liberarPreviewNovaImagem(): void {
    if (this.previewNovaImagem) {
      URL.revokeObjectURL(this.previewNovaImagem);
      this.previewNovaImagem = null;
    }
  }
}
