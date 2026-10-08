import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, Subject, Subscription, catchError, finalize, interval, merge, of, switchMap, tap, startWith } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { DiarioService, FrequenciaUsuarioResponseDTO, OcorrenciaResponseDTO } from 'src/app/shared/services/diario/diario.service';
import { ModalLayout } from '@components/modal-layout/modal-layout';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';

type FiltrosDiario = { idUnidade: number | null; idTurma: number | null; data: string };

@Component({
  selector: 'app-diario',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, ReactiveFormsModule, ModalLayout,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule
  ],
  templateUrl: './diario.html',
  styleUrl: './diario.css'
})
export class Diario implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {
  private fb = inject(FormBuilder);
  private unidadeService = inject(UnidadeService);
  private turmaService = inject(TurmaService);
  private diarioService = inject(DiarioService);
  private sessao = inject(SessaoService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private route = inject(ActivatedRoute);

  filtroForm: FormGroup = this.fb.group({
    idUnidade: [null, Validators.required],
    idTurma: [{ value: null, disabled: true }, Validators.required],
    data: [this.hojeFormatada(), Validators.required]
  });

  unidades: any[] = [];
  turmas: any[] = [];
  usuarios: FrequenciaUsuarioResponseDTO[] = [];
  
  estadoTela: 'VAZIO' | 'INICIAL' | 'PREENCHENDO' | 'SALVO' = 'VAZIO';
  carregando = false;
  salvando = false;
  declaracaoAceita = false;
  confirmandoTrocaFiltro = false;

  private subs: Subscription = new Subscription();
  private recarregar = new Subject<void>();
  private filtrosAlterados = new Subject<void>();
  private unidadeAlterada = new Subject<number | null>();
  private filtrosAplicados: FiltrosDiario = this.filtroForm.getRawValue();
  private destruido = false;
  private idTurmaInicialPendente: number | null = null;
  private deveAplicarSelecaoInicialTurma = false;

  modalOcorrenciaAberto = false;
  modoOcorrencia: 'LISTA' | 'NOVO' | 'EDITAR' | 'VER' = 'LISTA';
  modalTremendo = false;
  usuarioSelecionado: FrequenciaUsuarioResponseDTO | null = null;
  ocorrenciaSelecionada: OcorrenciaResponseDTO | null = null;
  
  formOcorrencia: FormGroup = this.fb.group({
    horaStr: ['', Validators.required],
    tipoOcorrencia: ['COMPORTAMENTO', Validators.required],
    descricao: ['', [Validators.required, Validators.pattern(/\S/)]]
  });
  errosOcorrencia: { [key: string]: string } = {};

  tiposOcorrencia = [
    { value: 'COMPORTAMENTO', label: 'Comportamento' },
    { value: 'SAUDE', label: 'Saúde' },
    { value: 'ASSISTENCIA', label: 'Assistência' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  get perfilQueryParams(): { returnUrl: string } {
    return { returnUrl: this.montarReturnUrlDiario() };
  }

  perfilAcessivel(usuario: FrequenciaUsuarioResponseDTO): boolean {
    return usuario.permiteAcessoPerfil !== false;
  }

  avisarPerfilInacessivel(): void {
    this.toastr.warning(
      'O perfil deste usuário foi excluído do sistema.'
    );
  }

  ngOnInit(): void {
    this.subs.add(interval(1000).subscribe(() => this.cdr.markForCheck()));

    this.subs.add(
      this.unidadeAlterada.pipe(
        tap(() => {
          this.turmas = [];
          this.filtroForm.get('idTurma')?.disable({ emitEvent: false });
        }),
        switchMap(id => id ? this.turmaService.listar(id).pipe(
          catchError(() => {
            this.toastr.error('Erro ao carregar as turmas.');
            return of([]);
          })
        ) : of([]))
      ).subscribe(turmas => {
        const id = this.filtroForm.get('idUnidade')?.value;
        this.turmas = turmas.filter(t => t.unidade.id === id);
        if (id) this.filtroForm.get('idTurma')?.enable({ emitEvent: false });
        this.aplicarSelecaoInicialTurma();
        this.cdr.markForCheck();
      })
    );

    this.subs.add(this.filtroForm.valueChanges.subscribe(() => {
      const novos: FiltrosDiario = this.filtroForm.getRawValue();
      // Mantenha os filtros da chamada atual até a confirmação do descarte.
      this.filtroForm.patchValue(this.filtrosAplicados, { emitEvent: false });
      void this.solicitarTrocaFiltros(novos);
    }));

    this.subs.add(
      merge(this.filtrosAlterados, this.recarregar).pipe(
        startWith(null),
        switchMap(() => {
          this.carregando = false;
          this.usuarios = [];
          this.estadoTela = 'VAZIO';
          this.declaracaoAceita = false;
          this.executarFechamentoModal();
          const { idUnidade, idTurma, data } = this.filtroForm.getRawValue();
          if (!idUnidade || !idTurma || !data || !this.turmas.some(t => t.id === idTurma && t.unidade.id === idUnidade)) {
            this.cdr.markForCheck();
            return EMPTY;
          }
          this.carregando = true;
          this.cdr.markForCheck();
          return this.diarioService.listarFrequencia(idTurma, data).pipe(
            catchError(() => {
              this.toastr.error('Erro ao carregar o diário de turma. Altere os filtros para tentar novamente.');
              return EMPTY;
            }),
            finalize(() => {
              this.carregando = false;
              this.cdr.markForCheck();
            })
          );
        })
      ).subscribe(dados => {
        this.usuarios = dados;
        this.estadoTela = dados.some(u => u.idFrequencia !== null) ? 'SALVO' : 'INICIAL';
        this.cdr.markForCheck();
      })
    );

    this.subs.add(this.sessao.carregar().subscribe(() => {
      this.carregarUnidades();
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.subs.unsubscribe();
  }

  private async solicitarTrocaFiltros(novos: FiltrosDiario): Promise<void> {
    if (this.salvando || this.confirmandoTrocaFiltro ||
      (novos.idUnidade === this.filtrosAplicados.idUnidade &&
        novos.idTurma === this.filtrosAplicados.idTurma && novos.data === this.filtrosAplicados.data)) return;

    if (!this.formularioTemAlteracoesNaoSalvas()) {
      this.aplicarFiltros(novos);
      return;
    }

    this.confirmandoTrocaFiltro = true;
    this.cdr.markForCheck();
    try {
      const confirmado = await Alertas.confirmarDescarte();
      if (confirmado && !this.destruido && !this.salvando) {
        this.ngZone.run(() => this.aplicarFiltros(novos));
      }
    } catch {
      // Se a confirmação falhar, preserve a chamada e o preenchimento.
    } finally {
      this.confirmandoTrocaFiltro = false;
      if (!this.destruido) this.cdr.markForCheck();
    }
  }

  private aplicarFiltros(novos: FiltrosDiario): void {
    const mudouUnidade = novos.idUnidade !== this.filtrosAplicados.idUnidade;
    const filtros = { ...novos, idTurma: mudouUnidade ? null : novos.idTurma };
    this.filtrosAplicados = filtros;
    this.filtroForm.patchValue(filtros, { emitEvent: false });
    if (mudouUnidade) this.unidadeAlterada.next(filtros.idUnidade);
    this.filtrosAlterados.next();
  }

  private carregarUnidades() {
    this.subs.add(this.unidadeService.listarTodas().subscribe({ next: dados => {
      const permitidas = this.sessao.unidadesPermitidasIds();
      this.unidades = permitidas === null ? dados : dados.filter((u: any) => permitidas.includes(u.id));
      this.aplicarSelecaoInicialUnidade();
      this.cdr.markForCheck();
    }, error: () => this.toastr.error('Erro ao carregar as unidades.') }));
  }

  private aplicarSelecaoInicialUnidade(): void {
    const filtrosUrl = this.obterFiltrosDaUrl();
    const idUnidadeUrlValida = filtrosUrl.idUnidade && this.unidades.some(u => u.id === filtrosUrl.idUnidade)
      ? filtrosUrl.idUnidade
      : null;
    const idUnidadeAuto = this.deveAutoSelecionarUnidade() && this.unidades.length === 1
      ? this.unidades[0].id
      : null;
    const idUnidade = idUnidadeUrlValida ?? idUnidadeAuto;

    if (!idUnidade || this.filtroForm.get('idUnidade')?.value) return;

    const filtros = {
      ...this.filtrosAplicados,
      idUnidade,
      idTurma: null,
      data: filtrosUrl.data ?? this.filtrosAplicados.data
    };
    this.idTurmaInicialPendente = filtrosUrl.idTurma ?? null;
    this.deveAplicarSelecaoInicialTurma = true;
    this.filtrosAplicados = filtros;
    this.filtroForm.patchValue(filtros, { emitEvent: false });
    this.unidadeAlterada.next(idUnidade);
  }

  private aplicarSelecaoInicialTurma(): void {
    if (!this.deveAplicarSelecaoInicialTurma) return;

    const filtrosAtuais: FiltrosDiario = this.filtroForm.getRawValue();
    const idTurmaUrlValida = this.idTurmaInicialPendente && this.turmas.some(t => t.id === this.idTurmaInicialPendente)
      ? this.idTurmaInicialPendente
      : null;
    const turmaAtual = this.turmas.find(t => this.agoraEstaNoIntervaloDaTurma(t));
    const idTurmaAuto = !idTurmaUrlValida && turmaAtual ? turmaAtual.id : null;
    const idTurma = idTurmaUrlValida ?? idTurmaAuto;

    this.deveAplicarSelecaoInicialTurma = false;
    this.idTurmaInicialPendente = null;
    if (!idTurma || filtrosAtuais.idTurma) return;

    const filtros = { ...filtrosAtuais, idTurma };
    this.filtrosAplicados = filtros;
    this.filtroForm.patchValue(filtros, { emitEvent: false });
    this.filtrosAlterados.next();
  }

  private deveAutoSelecionarUnidade(): boolean {
    return this.sessao.isCoordenador() || this.sessao.isMonitor();
  }

  private agoraEstaNoIntervaloDaTurma(turma: any): boolean {
    const data = this.filtroForm.get('data')?.value || this.hojeFormatada();
    const inicio = this.instanteBrasilia(`${data}T${turma.horaInicio}`);
    const fim = this.instanteBrasilia(`${data}T${turma.horaFim}`);
    const agora = Date.now();
    return agora >= inicio && agora <= fim;
  }

  private obterFiltrosDaUrl(): Partial<FiltrosDiario> {
    const params = this.route.snapshot.queryParamMap;
    const idUnidade = this.numeroQueryParam(params.get('idUnidade'));
    const idTurma = this.numeroQueryParam(params.get('idTurma'));
    const data = params.get('data');
    return {
      ...(idUnidade ? { idUnidade } : {}),
      ...(idTurma ? { idTurma } : {}),
      ...(data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? { data } : {})
    };
  }

  private numeroQueryParam(valor: string | null): number | null {
    if (!valor) return null;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
  }

  private montarReturnUrlDiario(): string {
    const { idUnidade, idTurma, data } = this.filtroForm.getRawValue();
    const params = new URLSearchParams();
    if (idUnidade) params.set('idUnidade', String(idUnidade));
    if (idTurma) params.set('idTurma', String(idTurma));
    if (data) params.set('data', data);
    const query = params.toString();
    return `/dashboard/diario${query ? `?${query}` : ''}`;
  }

  get isMonitor(): boolean {
    return this.sessao.isMonitor();
  }

  get podeIniciarChamada(): boolean {
    const idTurma = this.filtroForm.get('idTurma')?.value;
    const dataSelecionada = this.filtroForm.get('data')?.value;
    if (!idTurma || !dataSelecionada || this.estadoTela !== 'INICIAL' || this.salvando || !this.usuarios.length) return false;

    const turmaSelecionada = this.turmas.find(t => t.id === idTurma);
    if (!turmaSelecionada) return false;

    return this.perfilEstrategico || (this.isMonitor && Date.now() >= this.inicioDaTurma);
  }

  private get perfilEstrategico(): boolean {
    return this.sessao.isAdministrador() || this.sessao.isCoordenador();
  }

  private get inicioDaTurma(): number {
    const turma = this.turmas.find(t => t.id === this.filtroForm.get('idTurma')?.value);
    return this.instanteBrasilia(`${this.filtroForm.get('data')?.value}T${turma?.horaInicio}`);
  }

  get podeEditarFrequencia(): boolean {
    if (this.perfilEstrategico) return true;
    return this.isMonitor && Date.now() - this.inicioDaTurma <= 48 * 60 * 60 * 1000;
  }

  get podePreencherFrequencia(): boolean {
    return !this.salvando && this.estadoTela === 'PREENCHENDO'
      && (this.podeEditarFrequencia || !this.usuarios.some(u => u.idFrequencia !== null));
  }

  get podeAdicionarOcorrencia(): boolean {
    if (this.perfilEstrategico) return true;
    const data = this.filtroForm.get('data')?.value;
    const diffDias = (Date.parse(this.hojeFormatada()) - Date.parse(data)) / (24 * 60 * 60 * 1000);
    return this.isMonitor && diffDias >= 0 && diffDias <= 7;
  }

  podeEditarExcluirOcorrencia(oc: OcorrenciaResponseDTO): boolean {
    return this.perfilEstrategico || (this.isMonitor && Date.now() - this.instanteBrasilia(oc.dataCriacao) <= 24 * 60 * 60 * 1000);
  }

  get podeSalvarOcorrencia(): boolean {
    return !this.salvando && !!this.usuarioSelecionado && (
      this.modoOcorrencia === 'NOVO' ? this.podeAdicionarOcorrencia
        : this.modoOcorrencia === 'EDITAR' && !!this.ocorrenciaSelecionada && this.podeEditarExcluirOcorrencia(this.ocorrenciaSelecionada)
    );
  }

  alterarData(dias: number) {
    const dataAtual = new Date((this.filtroForm.get('data')?.value || this.hojeFormatada()) + 'T12:00:00');
    dataAtual.setDate(dataAtual.getDate() + dias);
    this.filtroForm.get('data')?.setValue(dataAtual.toISOString().split('T')[0]);
  }

  iniciarChamada() {
    if (!this.podeIniciarChamada) return;
    this.estadoTela = 'PREENCHENDO';
    this.declaracaoAceita = false;
    this.usuarios.forEach(u => u.presente = true);
  }

  editarChamada() {
    if (this.estadoTela !== 'SALVO' || !this.podeEditarFrequencia || this.salvando) return;
    this.estadoTela = 'PREENCHENDO';
    this.usuarios.forEach(u => u.presente ??= true);
    this.declaracaoAceita = false;
  }

  cancelarPreenchimento() {
    if (this.salvando) return;
    Alertas.confirmarDescarte().then(confirmado => {
      if (confirmado && !this.salvando) {
        this.recarregar.next();
      }
    });
  }

  marcarFrequencia(usuario: FrequenciaUsuarioResponseDTO, presente: boolean) {
    if (!this.podePreencherFrequencia) return;
    usuario.presente = presente;
  }

  salvarDiarioLote() {
    if (!this.declaracaoAceita || !this.podePreencherFrequencia || !this.usuarios.length) return;

    this.salvando = true;
    this.cdr.markForCheck();
    const dto = {
      idTurma: this.filtroForm.get('idTurma')?.value,
      data: this.filtroForm.get('data')?.value,
      frequencias: this.usuarios
        .map(u => ({
          idMatricula: u.idMatricula,
          presente: u.presente!
        }))
    };

    this.diarioService.salvarEmLote(dto).subscribe({
      next: () => {
        this.toastr.success('Diário salvo com sucesso!');
        this.salvando = false;
        this.estadoTela = 'SALVO';
        this.declaracaoAceita = false;
        this.cdr.markForCheck();
        this.recarregar.next();
      },
      error: () => {
        this.toastr.error('Erro ao salvar diário.');
        this.salvando = false;
        this.cdr.markForCheck();
      }
    });
  }

  get temAlteracoesNoDiario(): boolean {
    return this.estadoTela === 'PREENCHENDO';
  }

  get temAlteracoesNoModalOcorrencia(): boolean {
    if (this.modalOcorrenciaAberto && (this.modoOcorrencia === 'NOVO' || this.modoOcorrencia === 'EDITAR')) {
      return this.formOcorrencia.dirty;
    }
    return false;
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.temAlteracoesNoDiario || this.temAlteracoesNoModalOcorrencia;
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  abrirGerenciadorOcorrencias(usuario: FrequenciaUsuarioResponseDTO) {
    if (this.salvando || (!usuario.ocorrencias.length && !this.podeAdicionarOcorrencia)) return;
    this.usuarioSelecionado = usuario;
    if (usuario.ocorrencias && usuario.ocorrencias.length > 0) {
      this.modoOcorrencia = 'LISTA';
    } else {
      this.abrirFormOcorrencia(null, 'NOVO');
    }
    this.modalOcorrenciaAberto = true;
  }

  fecharModalOcorrencia() {
    if (this.salvando) return;
    if (!this.temAlteracoesNoModalOcorrencia) {
      this.executarFechamentoModal();
      return;
    }
    Alertas.confirmarDescarte().then(confirmado => {
      this.ngZone.run(() => {
        if (confirmado) this.executarFechamentoModal();
        else this.dispararTremorModal();
        this.cdr.markForCheck();
      });
    });
  }

  private executarFechamentoModal() {
    this.modalOcorrenciaAberto = false;
    this.usuarioSelecionado = null;
    this.formOcorrencia.enable();
    this.formOcorrencia.markAsPristine();
  }

  voltarParaLista() {
    if (this.salvando) return;
    if (!this.temAlteracoesNoModalOcorrencia) {
      this.executarVoltarParaLista();
      return;
    }
    Alertas.confirmarDescarte().then(confirmado => {
      this.ngZone.run(() => {
        if (confirmado) this.executarVoltarParaLista();
        else this.dispararTremorModal();
        this.cdr.markForCheck();
      });
    });
  }

  private executarVoltarParaLista() {
    if (this.usuarioSelecionado?.ocorrencias.length) {
      this.modoOcorrencia = 'LISTA';
      this.formOcorrencia.markAsPristine();
    } else {
      this.executarFechamentoModal();
    }
  }

  private dispararTremorModal() {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.markForCheck();
    }, 400);
  }

  abrirFormOcorrencia(oc: OcorrenciaResponseDTO | null, modo: 'NOVO' | 'EDITAR' | 'VER') {
    if (this.salvando || (modo === 'NOVO' && !this.podeAdicionarOcorrencia)
      || (modo === 'EDITAR' && (!oc || !this.podeEditarExcluirOcorrencia(oc)))) return;
    this.modoOcorrencia = modo;
    this.ocorrenciaSelecionada = oc;
    this.errosOcorrencia = {};
    
    if (modo === 'NOVO') {
      this.formOcorrencia.enable();
      this.formOcorrencia.reset({
        horaStr: this.agoraFormatada(),
        tipoOcorrencia: 'COMPORTAMENTO',
        descricao: ''
      });
    } else if (oc) {
      const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(this.instanteBrasilia(oc.dataCriacao));
      this.formOcorrencia.patchValue({
        horaStr: hora,
        tipoOcorrencia: oc.tipoOcorrencia,
        descricao: oc.descricao
      });
      
      if (modo === 'VER') {
        this.formOcorrencia.disable();
      } else {
        this.formOcorrencia.enable();
      }
    }
    this.formOcorrencia.markAsPristine();
  }

  salvarOcorrencia() {
    if (!this.podeSalvarOcorrencia) return;
    if (this.formOcorrencia.invalid) {
      this.errosOcorrencia = mapearErrosFormulario(this.formOcorrencia);
      return;
    }

    this.salvando = true;
    this.cdr.markForCheck();
    const { tipoOcorrencia, descricao } = this.formOcorrencia.getRawValue();
    const dataSelecionada = this.filtroForm.get('data')?.value;
    
    if (this.modoOcorrencia === 'NOVO') {
      const dto = {
        idMatricula: this.usuarioSelecionado!.idMatricula,
        dataOcorrencia: dataSelecionada,
        tipoOcorrencia,
        descricao
      };

      this.diarioService.criarOcorrencia(dto).subscribe({
        next: (novaOc) => {
          this.ngZone.run(() => {
            this.usuarioSelecionado!.ocorrencias.push(novaOc);
            this.formOcorrencia.markAsPristine();
            this.toastr.success('Ocorrência registrada com sucesso.', 'Sucesso');
            this.salvando = false;
            this.executarVoltarParaLista();
            this.cdr.markForCheck();
          });
        },
        error: () => { 
          this.ngZone.run(() => {
            this.toastr.error('Erro ao registrar ocorrência.'); 
            this.salvando = false; 
            this.cdr.markForCheck();
          });
        }
      });
    } else {
      const dto = { tipoOcorrencia, descricao };
      this.diarioService.atualizarOcorrencia(this.ocorrenciaSelecionada!.id, dto).subscribe({
        next: (ocAtualizada) => {
          this.ngZone.run(() => {
            const idx = this.usuarioSelecionado!.ocorrencias.findIndex(o => o.id === ocAtualizada.id);
            if (idx !== -1) this.usuarioSelecionado!.ocorrencias[idx] = ocAtualizada;
            this.formOcorrencia.markAsPristine();
            this.toastr.success('Ocorrência atualizada com sucesso.', 'Sucesso');
            this.salvando = false;
            this.executarVoltarParaLista();
            this.cdr.markForCheck();
          });
        },
        error: () => { 
          this.ngZone.run(() => {
            this.toastr.error('Erro ao atualizar ocorrência.'); 
            this.salvando = false; 
            this.cdr.markForCheck();
          });
        }
      });
    }
  }

  excluirOcorrencia(oc: OcorrenciaResponseDTO) {
    if (this.salvando || !this.podeEditarExcluirOcorrencia(oc)) return;
    Alertas.confirmarExclusao().then(confirma => {
      if (!confirma || !this.usuarioSelecionado || !this.podeEditarExcluirOcorrencia(oc)) return;
      this.salvando = true;
      this.cdr.markForCheck();
      
      this.diarioService.deletarOcorrencia(oc.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.salvando = false;
            this.usuarioSelecionado!.ocorrencias = this.usuarioSelecionado!.ocorrencias.filter(o => o.id !== oc.id);
            this.toastr.success('Ocorrência excluída com sucesso.', 'Sucesso');
            if (this.usuarioSelecionado!.ocorrencias.length === 0) {
              this.executarFechamentoModal();
            }
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.ngZone.run(() => {
             this.salvando = false;
             this.toastr.error('Erro ao excluir ocorrência.', 'Erro');
             this.cdr.markForCheck();
          });
        }
      });
    });
  }

  private hojeFormatada(): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  }

  private agoraFormatada(): string {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date());
  }

  private instanteBrasilia(iso: string): number {
    return Date.parse(/(Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}-03:00`);
  }

  formatarData(isoStr: string): string {
    if (!isoStr) return 'Selecione uma data';
    const d = new Date(isoStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  }

  formatarDataHora(isoStr: string): string {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(this.instanteBrasilia(isoStr)).replace(':', 'h');
  }

  obterLabelOcorrencia(tipo: string): string {
    return this.tiposOcorrencia.find(t => t.value === tipo)?.label || tipo;
  }
}
