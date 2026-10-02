import { ChangeDetectorRef, Component, HostListener, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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

import { CampoTextoConfig, GrupoSecaoConfig } from '../paginas-secoes.config';
import {
  CONTROLE_IMAGEM,
  MENSAGEM_IMAGEM_OBRIGATORIA,
  aplicarMascaraTelefone,
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
} from '../paginas-secoes.util';
import { SecaoImagemCampo } from '../secao-imagem-campo/secao-imagem-campo';

/**
 * Grupo exibido em tabela (Produtos da Gráfica, Pix): adicionar, editar por
 * modal e, quando o grupo permite, excluir. A rota de listagem do contrato
 * não é paginada, então a tabela mostra todos os itens do grupo.
 */
@Component({
  selector: 'app-secao-tabela',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalLayout,
    TabelaLayout,
    MatFormFieldModule,
    MatInputModule,
    SecaoImagemCampo,
  ],
  templateUrl: './secao-tabela.html',
  styleUrl: '../paginas-secoes.css',
})
export class SecaoTabela implements OnInit, ComponentComAlteracoesNaoSalvas {
  @Input({ required: true }) idPagina!: number;

  @Input({ required: true }) grupo!: GrupoSecaoConfig;

  readonly CONTROLE_IMAGEM = CONTROLE_IMAGEM;
  readonly limiteCaracteres = limiteCaracteres;

  itens: SecaoGrupo[] = [];
  carregandoLista = false;
  erroLista = false;

  colunas: TabelaColuna<SecaoGrupo>[] = [];

  acoesTabela: TabelaAcao<SecaoGrupo>[] = [];

  modalAberto = false;
  modalTremendo = false;
  salvando = false;

  /** Item em edição; null quando o modal está criando. */
  itemEditando: SecaoGrupo | null = null;

  form!: FormGroup;
  erros: { [key: string]: string } = {};

  arquivoSelecionado: File | null = null;

  private tentouSalvar = false;
  private valoresOriginais = '';

  constructor(
    private fb: FormBuilder,
    private secoesGrupoService: SecoesGrupoService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = criarFormularioGrupo(this.fb, this.grupo);
    this.colunas = this.montarColunas();
    this.acoesTabela = this.montarAcoes();
    this.carregar();
  }

  private montarColunas(): TabelaColuna<SecaoGrupo>[] {
    const colunas: TabelaColuna<SecaoGrupo>[] = this.grupo.campos.map((campo, indice) => ({
      chave: campo.campo,
      titulo: campo.rotulo,
      principalMobile: indice === 0,
      formatar: (valor: string | null) =>
        (campo.tipo === 'telefone' ? formatarTelefone(valor) : valor) || '-',
    }));

    if (this.grupo.imagem) {
      // A coluna principal no mobile continua sendo o primeiro campo de texto.
      const colunaImagem: TabelaColuna<SecaoGrupo> = {
        chave: 'imagem',
        titulo: this.grupo.imagem.rotulo,
        tipo: 'imagem',
      };

      if (this.grupo.imagemPrimeiro) {
        colunas.unshift(colunaImagem);
      } else {
        colunas.push(colunaImagem);
      }
    }

    return colunas;
  }

  private montarAcoes(): TabelaAcao<SecaoGrupo>[] {
    const acoes: TabelaAcao<SecaoGrupo>[] = [{ icone: 'edit', tooltip: 'Editar', acao: 'editar' }];

    if (this.grupo.permiteExcluir !== false) {
      acoes.push({ icone: 'delete', tooltip: 'Excluir', acao: 'excluir' });
    }

    return acoes;
  }

  /** Em grupo de registro único, o item já salvo é alterado pela ação de editar. */
  get podeAdicionar(): boolean {
    return !this.grupo.registroUnico || (!this.carregandoLista && this.itens.length === 0);
  }

  get modoEdicao(): boolean {
    return this.itemEditando !== null;
  }

  get tituloModal(): string {
    return this.modoEdicao ? `Editar ${this.grupo.nomeItem}` : `Novo ${this.grupo.nomeItem}`;
  }

  get imagemAtual(): string | null {
    return resolverUrlImagem(this.itemEditando?.imagem);
  }

  // ---------------------------------------------------------------
  // LISTAGEM
  // ---------------------------------------------------------------

  carregar(): void {
    this.carregandoLista = true;
    this.erroLista = false;

    this.secoesGrupoService.listarPorGrupo(this.idPagina, this.grupo.grupo).subscribe({
      next: (itens) => {
        this.itens = itens;
        this.carregandoLista = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregandoLista = false;
        this.erroLista = true;
        this.toastr.error(`Não foi possível carregar a lista de ${this.grupo.rotuloAba}.`, 'Erro');
        this.cdr.detectChanges();
      },
    });
  }

  executarAcao(evento: { tipo: string; linha: SecaoGrupo }): void {
    if (evento.tipo === 'editar') {
      this.abrirModal(evento.linha);
      return;
    }

    if (evento.tipo === 'excluir' && this.grupo.permiteExcluir !== false) {
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
          this.toastr.success(
            `${capitalizar(this.grupo.nomeItem)} excluído com sucesso!`,
            'Sucesso',
          );
          this.carregar();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.toastr.error(
            err?.error?.message || `Erro ao excluir ${this.grupo.nomeItem}.`,
            'Erro',
          );
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ---------------------------------------------------------------
  // MODAL DE CRIAÇÃO/EDIÇÃO
  // ---------------------------------------------------------------

  abrirModal(item?: SecaoGrupo): void {
    this.itemEditando = item ?? null;
    this.modalAberto = true;
    this.salvando = false;
    this.arquivoSelecionado = null;
    this.tentouSalvar = false;
    this.erros = {};

    this.form.reset(valoresIniciaisGrupo(this.grupo, this.itemEditando));
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.valoresOriginais = valoresTextoGrupo(this.grupo, this.form);
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
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  get temAlteracoes(): boolean {
    return (
      this.arquivoSelecionado !== null ||
      valoresTextoGrupo(this.grupo, this.form) !== this.valoresOriginais
    );
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

  aoDigitar(campo: CampoTextoConfig): void {
    if (campo.tipo === 'telefone') {
      aplicarMascaraTelefone(this.form.get(campo.campo));
    }
  }

  verificarErros(): void {
    this.erros = mapearErrosFormulario(this.form);

    // Imagem obrigatória só na criação (ou em item salvo sem imagem): sem
    // arquivo novo na edição, o back mantém a imagem atual.
    if (this.tentouSalvar && this.imagemPendente && !this.erros[CONTROLE_IMAGEM]) {
      this.erros[CONTROLE_IMAGEM] = MENSAGEM_IMAGEM_OBRIGATORIA;
    }
  }

  private get imagemPendente(): boolean {
    return imagemObrigatoriaPendente(
      this.grupo,
      this.itemEditando?.imagem,
      this.arquivoSelecionado,
    );
  }

  selecionarArquivo(arquivo: File): void {
    const valido = registrarArquivo(this.form, arquivo);
    this.arquivoSelecionado = valido ? arquivo : null;
    this.verificarErros();
  }

  salvar(): void {
    this.tentouSalvar = true;
    this.form.markAllAsTouched();
    this.verificarErros();

    if (this.form.invalid || this.imagemPendente) {
      return;
    }

    if (this.modoEdicao && !this.temAlteracoes) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.salvando = true;
    const dto = montarDtoGrupo(this.grupo, this.form, this.arquivoSelecionado);
    const editando = this.modoEdicao;

    const request = this.itemEditando
      ? this.secoesGrupoService.atualizar(this.idPagina, this.itemEditando.id, dto)
      : this.secoesGrupoService.criar(this.idPagina, dto);

    request.subscribe({
      next: () => {
        const nome = capitalizar(this.grupo.nomeItem);
        this.toastr.success(editando ? `${nome} atualizado!` : `${nome} criado!`, 'Sucesso');
        this.fecharModalSemConfirmacao();
        this.carregar();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.salvando = false;
        const { erros, mensagem } = extrairErrosApi(err, this.grupo);
        this.erros = { ...this.erros, ...erros };

        if (mensagem || !Object.keys(erros).length) {
          this.toastr.error(mensagem || `Erro ao salvar ${this.grupo.nomeItem}.`, 'Erro');
        }

        this.cdr.detectChanges();
      },
    });
  }
}
