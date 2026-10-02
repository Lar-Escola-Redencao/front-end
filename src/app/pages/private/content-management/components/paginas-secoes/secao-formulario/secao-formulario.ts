import { ChangeDetectorRef, Component, HostListener, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';
import {
  SecaoGrupo,
  SecoesGrupoService,
} from 'src/app/shared/services/pagina/secoes-grupo.service';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';

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
 * Grupo de registro único editado direto na tela (Telefone da Gráfica): sem
 * adicionar nem excluir. Enquanto o registro não existe, Salvar faz POST;
 * depois disso, sempre PUT no mesmo id.
 */
@Component({
  selector: 'app-secao-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    SecaoImagemCampo,
  ],
  templateUrl: './secao-formulario.html',
  styleUrl: '../paginas-secoes.css',
})
export class SecaoFormulario implements OnInit, ComponentComAlteracoesNaoSalvas {
  @Input({ required: true }) idPagina!: number;

  @Input({ required: true }) grupo!: GrupoSecaoConfig;

  readonly CONTROLE_IMAGEM = CONTROLE_IMAGEM;
  readonly limiteCaracteres = limiteCaracteres;

  secao: SecaoGrupo | null = null;

  carregando = false;
  erroCarregamento = false;
  salvando = false;

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
    this.preencherFormulario();
    this.carregar();
  }

  get imagemAtual(): string | null {
    return resolverUrlImagem(this.secao?.imagem);
  }

  carregar(): void {
    this.carregando = true;
    this.erroCarregamento = false;

    this.secoesGrupoService.listarPorGrupo(this.idPagina, this.grupo.grupo).subscribe({
      next: (secoes) => {
        this.carregando = false;
        this.secao = secoes[0] ?? null;
        this.preencherFormulario();
        this.cdr.detectChanges();
      },
      error: () => {
        // O formulário continua disponível: como o POST desses grupos é
        // upsert no back, salvar sem ter carregado não duplica o registro.
        this.carregando = false;
        this.erroCarregamento = true;
        this.toastr.error(`Não foi possível carregar os dados de ${this.grupo.rotuloAba}.`, 'Erro');
        this.cdr.detectChanges();
      },
    });
  }

  private preencherFormulario(): void {
    this.form.reset(valoresIniciaisGrupo(this.grupo, this.secao));
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.arquivoSelecionado = null;
    this.tentouSalvar = false;
    this.erros = {};
    this.valoresOriginais = valoresTextoGrupo(this.grupo, this.form);
  }

  get temAlteracoes(): boolean {
    return (
      this.arquivoSelecionado !== null ||
      valoresTextoGrupo(this.grupo, this.form) !== this.valoresOriginais
    );
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.temAlteracoes;
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

    // A obrigatoriedade da imagem depende do registro salvo, então fica fora
    // dos validators do controle e só aparece depois da primeira tentativa.
    if (this.tentouSalvar && this.imagemPendente && !this.erros[CONTROLE_IMAGEM]) {
      this.erros[CONTROLE_IMAGEM] = MENSAGEM_IMAGEM_OBRIGATORIA;
    }
  }

  private get imagemPendente(): boolean {
    return imagemObrigatoriaPendente(this.grupo, this.secao?.imagem, this.arquivoSelecionado);
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

    if (this.secao && !this.temAlteracoes) {
      this.toastr.info('Nenhum dado foi alterado.', 'Aviso');
      return;
    }

    this.salvando = true;
    const dto = montarDtoGrupo(this.grupo, this.form, this.arquivoSelecionado);

    const request = this.secao
      ? this.secoesGrupoService.atualizar(this.idPagina, this.secao.id, dto)
      : this.secoesGrupoService.criar(this.idPagina, dto);

    request.subscribe({
      next: (secao) => {
        this.salvando = false;
        this.toastr.success(`${capitalizar(this.grupo.nomeItem)} salvo com sucesso!`, 'Sucesso');
        this.secao = secao;
        this.erroCarregamento = false;
        this.preencherFormulario();
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
