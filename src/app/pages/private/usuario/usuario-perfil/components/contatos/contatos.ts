import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnDestroy, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { ToastrService } from 'ngx-toastr';
import { Subscription, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { AtualizarContatoDTO, ContatoDetalheDTO, ContatoListagemDTO, ContatoResponseDTO, UsuarioVinculadoDTO } from 'src/app/shared/models/contato.model';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { ContatoService } from 'src/app/shared/services/usuario/contato.service';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { obterMensagemErro } from 'src/app/shared/utils/form-validations';
import { formatarCpf, formatarTelefone } from 'src/app/shared/utils/masks';

type ModoModalContato = 'novo' | 'editar' | 'visualizar';

@Component({
  selector: 'app-usuario-perfil-contatos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ModalLayout,
    TabelaLayout
  ],
  templateUrl: './contatos.html',
  styleUrl: './contatos.css'
})
export class UsuarioPerfilContatos implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly contatoService = inject(ContatoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessao = inject(SessaoService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private buscaSub?: Subscription;

  @Input() usuario: UsuarioResponseDTO | null = null;
  @Input() somenteLeitura = false;
  @Output() usuarioAtualizado = new EventEmitter<UsuarioResponseDTO>();

  modalAberto = false;
  modoModal: ModoModalContato = 'novo';
  salvando = false;
  contatoSelecionado: (ContatoResponseDTO & Partial<ContatoDetalheDTO>) | null = null;
  carregandoVisualizacao = false;
  modalVinculosAberto = false;
  opcoesAutocomplete: ContatoListagemDTO[] = [];

  readonly opcoesBuscaContato = ['CPF', 'Telefone', 'Nome', 'E-mail'];
  readonly opcoesParentesco = [
    { value: 'MAE', label: 'Mãe' },
    { value: 'PAI', label: 'Pai' },
    { value: 'AVO', label: 'Avô/Avó' },
    { value: 'IRMAO', label: 'Irmão/Irmã' },
    { value: 'TIO', label: 'Tio/Tia' },
    { value: 'PRIMO', label: 'Primo/Prima' },
    { value: 'PADRASTO_MADRASTA', label: 'Padrasto/Madrasta' },
    { value: 'VIZINHO', label: 'Vizinho' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  readonly colunas: TabelaColuna<ContatoResponseDTO>[] = [
    {
      chave: 'nomeCompleto',
      titulo: 'Responsável',
      principalMobile: true,
      etiqueta: contato => contato.principal ? 'kid_star' : null
    },
    { chave: 'telefone', titulo: 'Telefone', tipo: 'telefone', formatar: valor => valor ? formatarTelefone(valor) : '-' },
    { chave: 'parentesco', titulo: 'Parentesco', formatar: valor => this.formatarParentesco(valor) }
  ];

  readonly acoes: TabelaAcao<ContatoResponseDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar contato', acao: 'visualizar' },
    { icone: 'edit', tooltip: 'Editar contato', acao: 'editar' },
    { icone: 'person_remove', tooltip: 'Remover vínculo', acao: 'excluir' }
  ];

  get acoesVisiveis(): TabelaAcao<ContatoResponseDTO>[] {
    return this.somenteLeitura ? this.acoes.filter(acao => acao.acao === 'visualizar') : this.acoes;
  }

  form = this.fb.group({
    id: [null as number | null],
    nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
    parentesco: ['', Validators.required],
    telefone: ['', [Validators.required, Validators.minLength(14)]],
    email: ['', Validators.email],
    endereco: [''],
    cpf: ['', Validators.minLength(14)],
    localTrabalho: [''],
    busca: [''],
    tipoBusca: ['Nome'],
    buscarExistente: [false],
    principal: [false]
  });

  get contatosOrdenados(): ContatoResponseDTO[] {
    return [...(this.usuario?.contatos ?? [])].sort((a, b) => Number(!!b.principal) - Number(!!a.principal));
  }

  get contatos(): ContatoResponseDTO[] {
    return this.contatosOrdenados;
  }

  get podeAdicionarContato(): boolean {
    return !this.somenteLeitura && this.contatosOrdenados.length < 4;
  }

  get tituloModal(): string {
    if (this.modoModal === 'visualizar') return this.contatoSelecionado?.nomeCompleto || 'Contato';
    return this.modoModal === 'editar' ? 'Editar contato' : 'Novo contato';
  }

  get contatoExistenteSelecionado(): boolean {
    return !!this.form.get('id')?.value && !!this.form.get('buscarExistente')?.value;
  }

  ngOnDestroy(): void {
    this.buscaSub?.unsubscribe();
  }

  adicionarContato(): void {
    if (!this.podeAdicionarContato) {
      this.toastr.warning('Máximo de 4 responsáveis atingido.');
      return;
    }
    this.abrirFormulario('novo');
  }

  executarAcao(evento: { tipo: string; linha: ContatoResponseDTO }): void {
    if (evento.tipo === 'visualizar') this.abrirVisualizacao(evento.linha);
    if (this.somenteLeitura) return;
    if (evento.tipo === 'editar') this.abrirFormulario('editar', evento.linha);
    if (evento.tipo === 'excluir') this.removerVinculo(evento.linha);
  }

  abrirVisualizacao(contato: ContatoResponseDTO): void {
    this.contatoSelecionado = contato;
    this.modoModal = 'visualizar';
    this.carregandoVisualizacao = true;
    this.modalAberto = true;
    this.contatoService.buscarDetalhe(contato.id).subscribe({
      next: detalhe => this.ngZone.run(() => {
        this.contatoSelecionado = this.normalizarDetalheContato(contato, detalhe);
        this.carregandoVisualizacao = false;
        this.atualizarTela();
      }),
      error: () => this.ngZone.run(() => {
        this.carregandoVisualizacao = false;
        this.toastr.warning('Não foi possível carregar os vínculos do contato.');
        this.atualizarTela();
      })
    });
  }

  abrirFormulario(modo: 'novo' | 'editar', contato?: ContatoResponseDTO): void {
    if (this.somenteLeitura) return;
    this.buscaSub?.unsubscribe();
    this.modoModal = modo;
    this.contatoSelecionado = contato ?? null;
    this.opcoesAutocomplete = [];
    this.form.reset({
      id: contato?.id ?? null,
      nomeCompleto: contato?.nomeCompleto ?? '',
      parentesco: contato?.parentesco ?? '',
      telefone: contato?.telefone ? formatarTelefone(contato.telefone) : '',
      email: contato?.email ?? '',
      endereco: contato?.endereco ?? '',
      cpf: contato?.cpf ? formatarCpf(contato.cpf) : '',
      localTrabalho: contato?.localTrabalho ?? '',
      busca: '',
      tipoBusca: 'Nome',
      buscarExistente: false,
      principal: !!contato?.principal
    });
    this.alternarBuscaContato(false);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.configurarAutocomplete();
    this.modalAberto = true;
  }

  fecharModal(): void {
    if (this.salvando) return;
    this.modalAberto = false;
    this.contatoSelecionado = null;
    this.opcoesAutocomplete = [];
    this.buscaSub?.unsubscribe();
    this.form.reset();
  }

  alternarBuscaContato(buscar: boolean): void {
    this.form.get('buscarExistente')?.setValue(buscar, { emitEvent: false });
    if (!buscar) {
      if (this.modoModal === 'novo') {
        this.form.get('id')?.setValue(null, { emitEvent: false });
      }
      this.habilitarCamposContato();
      this.opcoesAutocomplete = [];
      return;
    }

    this.form.patchValue({
      id: null,
      busca: '',
      tipoBusca: 'Nome',
      nomeCompleto: '',
      telefone: '',
      email: '',
      endereco: '',
      cpf: '',
      localTrabalho: ''
    }, { emitEvent: false });
    this.desabilitarCamposContato();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  onBuscaContatoAlterada(termo: string): void {
    if (!this.form.get('id')?.value) return;
    const selecionado = this.contatoSelecionado;
    if (selecionado && termo === selecionado.nomeCompleto) return;
    this.form.patchValue({
      id: null,
      nomeCompleto: '',
      telefone: '',
      email: '',
      endereco: '',
      cpf: '',
      localTrabalho: ''
    }, { emitEvent: false });
    this.desabilitarCamposContato();
  }

  selecionarContatoExistente(contato: ContatoListagemDTO): void {
    if (this.contatosOrdenados.some(c => c.id === contato.id)) {
      this.toastr.warning('Este contato já está vinculado ao usuário.');
      return;
    }

    this.contatoSelecionado = contato as ContatoResponseDTO;
    this.form.patchValue({
      id: contato.id,
      busca: contato.nomeCompleto,
      nomeCompleto: contato.nomeCompleto,
      telefone: formatarTelefone(contato.telefone),
      email: contato.email ?? '',
      endereco: contato.endereco ?? '',
      cpf: formatarCpf(contato.cpf),
      localTrabalho: contato.localTrabalho ?? ''
    }, { emitEvent: false });
    this.opcoesAutocomplete = [];
    this.form.markAsDirty();
  }

  abrirVinculosDoContato(): void {
    if (!this.contatoSelecionado) return;
    this.modalVinculosAberto = true;
    if (this.contatoSelecionado.vinculos) {
      this.atualizarTela();
      return;
    }

    this.carregandoVisualizacao = true;
    const contatoBase = this.contatoSelecionado as ContatoResponseDTO;
    this.contatoService.buscarDetalhe(contatoBase.id).subscribe({
      next: detalhe => this.ngZone.run(() => {
        this.contatoSelecionado = this.normalizarDetalheContato(contatoBase, detalhe);
        this.carregandoVisualizacao = false;
        this.atualizarTela();
      }),
      error: () => this.ngZone.run(() => {
        this.carregandoVisualizacao = false;
        this.toastr.error('Erro ao carregar os usuários vinculados a este contato.', 'Erro');
        this.atualizarTela();
      })
    });
  }

  fecharVinculos(): void {
    this.modalVinculosAberto = false;
  }

  get vinculosContato(): UsuarioVinculadoDTO[] {
    return this.contatoSelecionado?.vinculos ?? [];
  }

  podeRemoverEsteVinculo(vinculo: UsuarioVinculadoDTO): boolean {
    return this.sessao.podeRemoverVinculo(vinculo.idUnidade);
  }

  exibirNomeContatoBusca(contato: ContatoListagemDTO | string | null): string {
    return typeof contato === 'string' ? contato : contato?.nomeCompleto || '';
  }

  aplicarMascaraTelefone(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.get('telefone')?.setValue(formatarTelefone(input.value), { emitEvent: false });
  }

  aplicarMascaraCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.get('cpf')?.setValue(formatarCpf(input.value), { emitEvent: false });
  }

  async salvar(): Promise<void> {
    if (!this.usuario?.id || this.somenteLeitura || this.salvando || this.modoModal === 'visualizar') return;
    this.form.markAllAsTouched();

    if (this.form.get('buscarExistente')?.value && !this.form.get('id')?.value) {
      this.toastr.warning('Selecione um contato existente ou desmarque a busca para cadastrar um novo contato.');
      return;
    }

    if (this.form.invalid) {
      this.toastr.warning('Verifique os campos obrigatórios do contato.');
      return;
    }

    const dados = this.form.getRawValue();
    if (dados.principal && this.usuarioTemOutroPrincipal(dados.id ?? this.contatoSelecionado?.id ?? null)) {
      const confirmou = await Alertas.confirmarSubstituirContatoPrincipal();
      if (!confirmou) return;
    }

    this.salvando = true;
    const idUsuario = this.usuario.id;

    const requisicao = this.modoModal === 'novo'
      ? dados.buscarExistente && dados.id
        ? this.usuarioService.vincularContatoExistente(idUsuario, dados.id, {
          parentesco: dados.parentesco!,
          principal: !!dados.principal
        })
        : this.usuarioService.vincularNovoContato(idUsuario, this.montarContatoDto())
      : this.contatoService.atualizarContato(this.contatoSelecionado!.id, this.montarAtualizacaoContatoDto()).pipe(
        switchMap(() => this.usuarioService.atualizarVinculo(idUsuario, this.contatoSelecionado!.id, {
          parentesco: dados.parentesco!,
          principal: !!dados.principal
        })),
        switchMap(() => this.usuarioService.buscarPorId(idUsuario))
      );

    requisicao.subscribe({
      next: usuario => {
        this.salvando = false;
        this.toastr.success(this.modoModal === 'novo' ? 'Contato vinculado com sucesso!' : 'Contato atualizado com sucesso!', 'Sucesso');
        this.usuarioAtualizado.emit(usuario);
        this.fecharModal();
      },
      error: err => {
        this.salvando = false;
        this.toastr.error(err.error?.message || 'Erro ao salvar contato.', 'Erro');
      }
    });
  }

  async removerVinculo(contato: ContatoResponseDTO): Promise<void> {
    if (!this.usuario?.id) return;
    if (contato.principal) {
      this.toastr.warning('O contato principal não pode ser removido. Altere o contato principal do usuário e tente novamente.', 'Atenção');
      return;
    }

    const confirmado = await Alertas.confirmarExclusao('Este vínculo será removido do usuário.');
    if (!confirmado) return;

    this.usuarioService.desvincularContato(this.usuario.id, contato.id).pipe(
      switchMap(() => this.usuarioService.buscarPorId(this.usuario!.id))
    ).subscribe({
      next: usuario => {
        this.toastr.success('Vínculo removido com sucesso!', 'Sucesso');
        this.usuarioAtualizado.emit(usuario);
      },
      error: err => this.toastr.error(err.error?.message || 'Erro ao remover vínculo.', 'Erro')
    });
  }

  async removerVinculoDaLista(vinculo: UsuarioVinculadoDTO): Promise<void> {
    if (!this.contatoSelecionado || !this.podeRemoverEsteVinculo(vinculo)) return;

    if (vinculo.principal) {
      this.toastr.warning('Vínculo principal não pode ser removido. Altere o contato principal do usuário e tente novamente.', 'Atenção');
      return;
    }

    const idUsuario = vinculo.idUsuario;
    if (!idUsuario) {
      this.toastr.error('Não foi possível identificar o usuário vinculado a este contato.', 'Erro');
      return;
    }

    const confirmado = await Alertas.confirmarExclusao('Este vínculo será removido do usuário.');
    if (!confirmado || !this.contatoSelecionado) return;

    this.usuarioService.desvincularContato(idUsuario, this.contatoSelecionado.id).subscribe({
      next: () => this.ngZone.run(() => {
        this.toastr.success('Vínculo removido com sucesso!', 'Sucesso');
        this.contatoSelecionado = {
          ...this.contatoSelecionado!,
          quantidadeVinculos: Math.max(0, (this.contatoSelecionado!.quantidadeVinculos ?? this.vinculosContato.length) - 1),
          vinculos: this.vinculosContato.filter(v => v.idUsuario !== idUsuario)
        };

        if (this.usuario?.id === idUsuario) {
          this.usuarioService.buscarPorId(idUsuario).subscribe(usuario => this.usuarioAtualizado.emit(usuario));
        }

        this.atualizarTela();
      }),
      error: err => this.toastr.error(err.error?.message || 'Erro ao remover vínculo.', 'Erro')
    });
  }

  mensagemErro(ctrl: AbstractControl | null, rotulo?: string): string {
    const erros = ctrl?.errors;
    if (!erros) return '';
    if (erros['servidor']) return typeof erros['servidor'] === 'string' ? erros['servidor'] : 'Valor inválido.';
    if (erros['minlength'] && rotulo) return `${rotulo} incompleto.`;
    return obterMensagemErro(erros);
  }

  formatarParentesco(valor?: string): string {
    const labels = Object.fromEntries(this.opcoesParentesco.map(opcao => [opcao.value, opcao.label]));
    return valor ? labels[valor] ?? valor : '-';
  }

  formatarTelefoneContato(valor?: string | null): string {
    return valor ? formatarTelefone(valor) : 'Telefone não informado';
  }

  hrefTelefoneContato(valor?: string | null): string | null {
    const telefone = String(valor ?? '').replace(/\D/g, '');
    return telefone ? `tel:${telefone}` : null;
  }

  formatarCpfContato(valor?: string | null): string {
    return valor ? formatarCpf(valor) : 'CPF não informado';
  }

  private configurarAutocomplete(): void {
    this.buscaSub = new Subscription();
    this.buscaSub.add(this.form.get('tipoBusca')!.valueChanges.subscribe(() => {
      this.form.patchValue({
        id: null,
        busca: '',
        nomeCompleto: '',
        telefone: '',
        email: '',
        endereco: '',
        cpf: '',
        localTrabalho: ''
      }, { emitEvent: false });
      this.opcoesAutocomplete = [];
      if (this.form.get('buscarExistente')?.value) this.desabilitarCamposContato();
    }));

    this.buscaSub.add(this.form.get('busca')!.valueChanges.pipe(
      tap(() => this.opcoesAutocomplete = []),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(termo => this.form.get('buscarExistente')?.value && typeof termo === 'string' && termo.trim().length >= 2
        ? this.contatoService.buscarAutocomplete(termo.trim()).pipe(catchError(() => of([])))
        : of([])
      )
    ).subscribe(contatos => {
      this.ngZone.run(() => {
        const termo = this.form.get('busca')?.value || '';
        const tipoBusca = this.form.get('tipoBusca')?.value;
        const idsVinculados = new Set(this.contatosOrdenados.map(contato => contato.id));
        this.opcoesAutocomplete = contatos
          .filter(contato => !idsVinculados.has(contato.id))
          .filter(contato => this.contatoCorrespondeTipoBusca(contato, tipoBusca, termo));
        this.atualizarTela();
      });
    }));
  }

  private contatoCorrespondeTipoBusca(contato: ContatoListagemDTO, tipoBusca: unknown, termo: string): boolean {
    const texto = termo.trim().toLowerCase();
    const numeros = termo.replace(/\D/g, '');
    switch (tipoBusca) {
      case 'CPF':
        return !!numeros && (contato.cpf || '').replace(/\D/g, '').includes(numeros);
      case 'Telefone':
        return !!numeros && (contato.telefone || '').replace(/\D/g, '').includes(numeros);
      case 'E-mail':
        return (contato.email || '').toLowerCase().includes(texto);
      case 'Nome':
      default:
        return contato.nomeCompleto.toLowerCase().includes(texto);
    }
  }

  private normalizarDetalheContato(contato: ContatoResponseDTO, detalhe: ContatoDetalheDTO): ContatoResponseDTO & Partial<ContatoDetalheDTO> {
    return {
      ...contato,
      ...detalhe,
      telefone: detalhe.telefone || contato.telefone,
      cpf: detalhe.cpf || contato.cpf,
      parentesco: contato.parentesco,
      principal: contato.principal,
      quantidadeVinculos: detalhe.quantidadeVinculos ?? detalhe.vinculos?.length ?? 0,
      vinculos: detalhe.vinculos ?? []
    };
  }

  private habilitarCamposContato(): void {
    for (const campo of ['nomeCompleto', 'telefone', 'email', 'endereco', 'cpf', 'localTrabalho']) {
      this.form.get(campo)?.enable({ emitEvent: false });
    }
  }

  private desabilitarCamposContato(): void {
    for (const campo of ['nomeCompleto', 'telefone', 'email', 'endereco', 'cpf', 'localTrabalho']) {
      this.form.get(campo)?.disable({ emitEvent: false });
    }
  }

  private usuarioTemOutroPrincipal(idContatoAtual: number | null): boolean {
    return this.contatosOrdenados.some(contato => contato.principal && contato.id !== idContatoAtual);
  }

  private montarContatoDto() {
    const dados = this.form.getRawValue();
    return {
      nomeCompleto: dados.nomeCompleto!,
      telefone: dados.telefone?.replace(/\D/g, '') || '',
      email: dados.email || undefined,
      endereco: dados.endereco || undefined,
      cpf: dados.cpf?.replace(/\D/g, '') || undefined,
      localTrabalho: dados.localTrabalho || undefined,
      parentesco: dados.parentesco!,
      principal: !!dados.principal
    };
  }

  private montarAtualizacaoContatoDto(): AtualizarContatoDTO {
    const dados = this.form.getRawValue();
    return {
      nomeCompleto: dados.nomeCompleto!,
      telefone: dados.telefone?.replace(/\D/g, '') || '',
      email: dados.email || undefined,
      endereco: dados.endereco || undefined,
      cpf: dados.cpf?.replace(/\D/g, '') || undefined,
      localTrabalho: dados.localTrabalho || undefined
    };
  }

  private atualizarTela(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
