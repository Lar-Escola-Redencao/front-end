import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subscription, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { Turma } from 'src/app/shared/models/turma.model';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { ModalLayout } from 'src/app/components/modal-layout/modal-layout';
import { UsuarioPerfilAbaPlaceholder } from './components/aba-placeholder/aba-placeholder';
import { UsuarioPerfilContatos } from './components/contatos/contatos';
import { UsuarioPerfilDadosPessoais } from './components/dados-pessoais/dados-pessoais';
import { UsuarioPerfilDadosSocioeconomicos } from './components/dados-socioeconomicos/dados-socioeconomicos';
import { UsuarioPerfilSaude } from './components/saude/saude';
import { UsuarioPerfilMatriculas } from './components/matriculas/matriculas';
import { Alertas } from 'src/app/shared/utils/alerts';

type AbaPerfil = 'acompanhamento' | 'contatos' | 'saude' | 'dados-pessoais' | 'dados-socioeconomicos' | 'matricula';

@Component({
  selector: 'app-usuario-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ModalLayout,
    UsuarioPerfilAbaPlaceholder,
    UsuarioPerfilContatos,
    UsuarioPerfilDadosPessoais,
    UsuarioPerfilDadosSocioeconomicos,
    UsuarioPerfilSaude,
    UsuarioPerfilMatriculas
  ],
  templateUrl: './usuario-perfil.html',
  styleUrl: './usuario-perfil.css',
})
export class UsuarioPerfil implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessao = inject(SessaoService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly turmaService = inject(TurmaService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly toastr = inject(ToastrService);
  private sub?: Subscription;

  @ViewChild(UsuarioPerfilDadosPessoais) private dadosPessoais?: UsuarioPerfilDadosPessoais;
  @ViewChild(UsuarioPerfilDadosSocioeconomicos) private dadosSocioeconomicos?: UsuarioPerfilDadosSocioeconomicos;
  @ViewChild(UsuarioPerfilSaude) private saude?: UsuarioPerfilSaude;

  usuario: UsuarioResponseDTO | null = null;
  carregando = true;
  erro = '';
  abaAtiva: AbaPerfil = 'acompanhamento';
  modalDesligamentoAberto = false;
  modalTransferenciaAberto = false;
  modoSelecaoTurma: 'transferencia' | 'rematricula' = 'transferencia';
  salvandoDesligamento = false;
  salvandoTransferencia = false;
  carregandoUnidadesTransferencia = false;
  carregandoTurmasTransferencia = false;
  unidadesTransferencia: Unidade[] = [];
  turmasTransferencia: Turma[] = [];
  fotoPerfilIndisponivel = false;
  private returnUrl: string | null = null;

  readonly formDesligamento = this.fb.group({
    dataDesligamento: ['', Validators.required],
    justificativa: ['', Validators.required]
  });

  readonly formTransferencia = this.fb.group({
    idUnidade: this.fb.control<number | null>(null, Validators.required),
    idTurmaNova: this.fb.control<number | null>({ value: null, disabled: true }, Validators.required),
    dataTransferencia: ['', Validators.required]
  });

  readonly abas: { id: AbaPerfil; label: string }[] = [
    { id: 'acompanhamento', label: 'Acompanhamento' },
    { id: 'contatos', label: 'Contatos' },
    { id: 'saude', label: 'Saúde' },
    { id: 'dados-pessoais', label: 'Dados pessoais' },
    { id: 'dados-socioeconomicos', label: 'Dados socioeconômicos' },
    { id: 'matricula', label: 'Matrícula' }
  ];

  ngOnInit(): void {
    this.returnUrl = this.obterReturnUrl();
    this.sessao.carregar().subscribe(() => this.carregarPerfil());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  carregarPerfil(): void {
    this.sub?.unsubscribe();
    this.sub = this.route.paramMap.pipe(
      switchMap(params => {
        this.carregando = true;
        this.erro = '';
        this.atualizarTela();
        return this.usuarioService.buscarPorId(Number(params.get('id')), true);
      })
    ).subscribe({
      next: usuario => {
        this.ngZone.run(() => {
          this.usuario = usuario;
          this.fotoPerfilIndisponivel = false;
          this.carregando = false;
          this.atualizarTela();
        });
      },
      error: (erro: { status?: number }) => {
        this.ngZone.run(() => {
          if (erro.status === 403) {
            this.toastr.clear();
            this.toastr.error(
              'Este usuário pertence a outra unidade ou foi transferido.',
              'Acesso negado'
            );
            this.voltarAposAcessoNegado('Você não tem acesso a este perfil.');
            return;
          }
          if (erro.status === 404) {
            this.toastr.clear();
            this.toastr.error('O usuário informado não foi encontrado.', 'Usuário não encontrado');
            this.voltarAposAcessoNegado('O usuário informado não foi encontrado.');
            return;
          }
          this.erro = 'Não foi possível carregar o perfil do usuário.';
          this.carregando = false;
          this.atualizarTela();
        });
      }
    });
  }

  async selecionarAba(aba: AbaPerfil): Promise<void> {
    if (this.monitor && !this.abasVisiveis.some(item => item.id === aba)) return;

    if (aba === this.abaAtiva) return;

    const abaAtual = this.obterAbaEditavelAtual();
    if (abaAtual?.temAlteracoes) {
      const confirmou = await Alertas.confirmarDescarte();
      if (!confirmou) return;
      abaAtual.cancelar();
    }

    this.abaAtiva = aba;
  }

  atualizarUsuario(usuario: UsuarioResponseDTO): void {
    this.usuario = usuario;
    this.fotoPerfilIndisponivel = false;
  }

  voltar(): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }
    this.router.navigate([this.monitor ? '/dashboard/diario' : '/dashboard/usuarios']);
  }

  private voltarAposAcessoNegado(mensagem?: string): void {
    this.carregando = false;
    this.usuario = null;
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
      return;
    }
    this.erro = mensagem || 'Não foi possí­vel carregar o perfil do usuário.';
    this.atualizarTela();
  }

  private obterAbaEditavelAtual(): UsuarioPerfilDadosPessoais | UsuarioPerfilDadosSocioeconomicos | UsuarioPerfilSaude | undefined {
    if (this.abaAtiva === 'dados-pessoais') return this.dadosPessoais;
    if (this.abaAtiva === 'dados-socioeconomicos') return this.dadosSocioeconomicos;
    if (this.abaAtiva === 'saude') return this.saude;
    return undefined;
  }

  private obterReturnUrl(): string | null {
    const snapshot = this.route.snapshot;
    const valor = snapshot?.queryParamMap?.get('returnUrl') || null;
    return valor?.startsWith('/dashboard/') ? valor : null;
  }

  get fotoPerfil(): string | null {
    return this.fotoPerfilIndisponivel ? null : this.obterUrlArquivo(this.usuario?.imagemPerfil);
  }

  onErroFotoPerfil(): void { this.fotoPerfilIndisponivel = true; }

  get idade(): string {
    const anos = this.calcularIdade(this.usuario?.dataNascimento);
    if (anos === null) return 'Idade não informada';
    return `${anos.toString().padStart(2, '0')} anos (${this.formatarDataNascimentoCurta(this.usuario?.dataNascimento)})`;
  }

  get desde(): string {
    const data = this.usuario?.dataPrimeiraMatricula || this.usuario?.dataIngresso;
    return data ? `Desde ${this.formatarDataCurta(data)}` : 'Desde não informado';
  }

  get turma(): string {
    return this.formatarTurma(this.usuario?.nomeTurma);
  }

  get desligado(): boolean {
    const status = (this.usuario?.statusMatricula || this.usuario?.status || '').toString().toUpperCase();
    return status === 'EGRESSO';
  }

  get monitor(): boolean {
    return this.sessao.isMonitor();
  }

  get abasVisiveis(): { id: AbaPerfil; label: string }[] {
    if (!this.monitor) return this.abas;
    return this.abas.filter(aba => ['acompanhamento', 'contatos', 'saude'].includes(aba.id));
  }

  abrirModalDesligamento(): void {
    if (!this.usuario?.id || this.desligado || this.monitor) return;
    this.formDesligamento.reset({ dataDesligamento: this.dataHoje(), justificativa: '' });
    this.modalDesligamentoAberto = true;
  }

  fecharModalDesligamento(): void {
    if (this.salvandoDesligamento) return;
    this.modalDesligamentoAberto = false;
  }

  async confirmarDesligamento(): Promise<void> {
    if (!this.usuario?.id || this.desligado || this.monitor) return;

    this.formDesligamento.markAllAsTouched();
    const dataDesligamento = this.formDesligamento.value.dataDesligamento || '';
    const justificativa = this.formDesligamento.value.justificativa?.trim() || '';
    if (this.formDesligamento.invalid || !dataDesligamento || !justificativa) return;
    if (!this.validarDataMinima(this.formDesligamento.get('dataDesligamento'), dataDesligamento)) return;

    const confirmou = await this.confirmarAcaoCritica(
      'Confirmar desligamento?',
      'O usuário será removido do diário atual, mas poderá ser matriculado novamente.',
      'desligar-usuario',
      'Confirmar desligamento'
    );
    if (!confirmou) return;

    const usuarioAtual = this.usuario;
    this.salvandoDesligamento = true;
    this.usuarioService.inativar(usuarioAtual.id, { dataDesligamento, justificativa }).subscribe({
      next: () => this.ngZone.run(() => {
        this.usuario = {
          ...usuarioAtual,
          status: 'EGRESSO',
          statusMatricula: 'EGRESSO',
          dataDesligamento,
          justificativaEgresso: justificativa
        };
        this.salvandoDesligamento = false;
        this.modalDesligamentoAberto = false;
        this.toastr.success('Usuário desligado com sucesso.', 'Sucesso');
        this.atualizarTela();
      }),
      error: (err) => this.ngZone.run(() => {
        this.salvandoDesligamento = false;
        if (this.erroJaExibidoPeloInterceptor(err)) {
          this.atualizarTela();
          return;
        }
        this.toastr.error(err.error?.message || 'Não foi possível desligar o usuário.', 'Erro');
        this.atualizarTela();
      })
    });
  }

  abrirModalTransferencia(): void {
    if (!this.usuario?.id || this.desligado || this.monitor) return;

    this.modoSelecaoTurma = 'transferencia';
    this.formTransferencia.reset({
      idUnidade: this.usuario.idUnidade || null,
      idTurmaNova: null,
      dataTransferencia: this.dataHoje()
    });
    this.formTransferencia.get('idTurmaNova')?.disable();
    this.turmasTransferencia = [];
    this.modalTransferenciaAberto = true;

    this.carregarUnidadesTransferencia();
    if (this.usuario.idUnidade) {
      this.carregarTurmasTransferencia(this.usuario.idUnidade);
    }
  }

  abrirModalRematricula(): void {
    if (!this.usuario?.id || !this.desligado || this.monitor) return;
    this.modoSelecaoTurma = 'rematricula';
    this.formTransferencia.reset({ idUnidade: null, idTurmaNova: null, dataTransferencia: this.dataHoje() });
    this.formTransferencia.get('idTurmaNova')?.disable();
    this.turmasTransferencia = [];
    this.modalTransferenciaAberto = true;
    this.carregarUnidadesTransferencia();
  }

  fecharModalTransferencia(): void {
    if (this.salvandoTransferencia) return;
    this.modalTransferenciaAberto = false;
  }

  onUnidadeTransferenciaChange(idUnidade: number | null): void {
    this.formTransferencia.get('idTurmaNova')?.reset(null);
    this.formTransferencia.get('idTurmaNova')?.disable();
    this.turmasTransferencia = [];
    if (idUnidade) {
      this.carregarTurmasTransferencia(idUnidade);
    }
  }

  get turmasDisponiveisTransferencia(): Turma[] {
    return this.modoSelecaoTurma === 'rematricula' ? this.turmasTransferencia : this.turmasTransferencia.filter(turma => turma.id !== this.usuario?.idTurma);
  }

  get unidadesDisponiveisTransferencia(): Unidade[] {
    if (this.modoSelecaoTurma !== 'rematricula' || !this.sessao.isCoordenador()) {
      return this.unidadesTransferencia;
    }

    const permitidas = this.sessao.unidadesPermitidasIds();
    return permitidas === null
      ? this.unidadesTransferencia
      : this.unidadesTransferencia.filter(unidade => permitidas.includes(unidade.id));
  }

  get turmaTransferenciaSelecionada(): Turma | undefined {
    const idTurma = this.formTransferencia.get('idTurmaNova')?.value;
    return this.turmasDisponiveisTransferencia.find(turma => turma.id === idTurma);
  }

  get conflitoPeriodoTransferencia(): boolean {
    const periodoEscolar = this.usuario?.periodoEscolar;
    const turma = this.turmaTransferenciaSelecionada;
    return !!turma?.periodo && !!periodoEscolar && turma.periodo === periodoEscolar;
  }

  get avisoConflitoPeriodoTransferencia(): string {
    const label = this.formatarPeriodoEscolar(this.usuario?.periodoEscolar).toLowerCase();
    return `Conflito de horário identificado. O estudante declarou que estuda de ${label}, e a turma selecionada também é nesse período.`;
  }

  async confirmarTransferencia(): Promise<void> {
    if (!this.usuario?.id) return;

    this.formTransferencia.markAllAsTouched();
    if (this.formTransferencia.invalid) return;

    const turma = this.turmaTransferenciaSelecionada;
    if (!turma) return;
    const dataTransferencia = this.formTransferencia.value.dataTransferencia || '';
    if (!dataTransferencia) return;
    if (!this.validarDataMinima(this.formTransferencia.get('dataTransferencia'), dataTransferencia)) return;

    const mesmaUnidade = turma.unidade.id === this.usuario.idUnidade;
    const periodo = this.formatarPeriodoTurma(turma.periodo).toLowerCase();
    const texto = mesmaUnidade
      ? `Você está trocando o turno do usuário para ${periodo}.`
      : `Você está transferindo o usuário para a unidade ${turma.unidade.nome} no período ${periodo}.`;

    const confirmou = await this.confirmarAcaoCritica(
      'Confirmar transferência?',
      texto,
      'transferir-usuario',
      'Confirmar transferência',
      mesmaUnidade ? 'question' : 'warning'
    );
    if (!confirmou) return;

    this.salvandoTransferencia = true;
    this.usuarioService.transferirTurma(this.usuario.id, turma.id, dataTransferencia).subscribe({
      next: usuario => this.ngZone.run(() => {
        this.usuario = usuario;
        this.salvandoTransferencia = false;
        this.modalTransferenciaAberto = false;
        if (!usuario.matriculaCorrigida) this.toastr.success('Usuário transferido com sucesso.', 'Sucesso');
        if (usuario.matriculaCorrigida) this.toastr.success('Matrícula corrigida');
        if (this.sessao.isCoordenador() && !this.sessao.temAcessoAUnidade(usuario.idUnidade)) {
          this.router.navigate(['/dashboard/usuarios']);
          return;
        }
        this.atualizarTela();
      }),
      error: (err) => this.ngZone.run(() => {
        this.salvandoTransferencia = false;
        if (this.erroJaExibidoPeloInterceptor(err)) {
          this.atualizarTela();
          return;
        }
        this.toastr.error(err.error?.message || 'Não foi possível transferir o usuário.', 'Erro');
        this.atualizarTela();
      })
    });
  }

  get dataMinimaTransferencia(): string | null {
    return this.usuario?.dataIngresso ? this.normalizarDataInput(this.usuario.dataIngresso) : null;
  }

  private dataHoje(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private normalizarDataInput(valor?: string | null): string {
    return valor ? valor.split('T')[0] : '';
  }

  private validarDataMinima(controle: ReturnType<typeof this.formTransferencia.get>, data: string): boolean {
    const dataMinima = this.dataMinimaTransferencia;
    if (dataMinima && data < dataMinima) {
      controle?.setErrors({ ...(controle.errors || {}), dataAnteriorIngresso: true });
      controle?.markAsTouched();
      return false;
    }
    if (controle?.errors?.['dataAnteriorIngresso']) {
      const { dataAnteriorIngresso, ...demaisErros } = controle.errors;
      controle.setErrors(Object.keys(demaisErros).length ? demaisErros : null);
    }
    return true;
  }

  confirmarSelecaoTurma(): void {
    this.modoSelecaoTurma === 'rematricula' ? this.confirmarRematricula() : this.confirmarTransferencia();
  }

  async confirmarRematricula(): Promise<void> {
    if (!this.usuario?.id) return;
    this.formTransferencia.markAllAsTouched();
    if (this.formTransferencia.invalid) return;
    const turma = this.turmaTransferenciaSelecionada;
    if (!turma) return;

    const confirmou = await this.confirmarAcaoCritica(
      'Confirmar rematrícula?',
      `O usuário será matriculado na unidade ${turma.unidade.nome} no período ${this.formatarPeriodoTurma(turma.periodo).toLowerCase()}.`,
      'matricular-novamente',
      'Confirmar rematrícula',
      'question'
    );
    if (!confirmou) return;

    this.salvandoTransferencia = true;
    this.usuarioService.rematricular(this.usuario.id, turma.id).subscribe({
      next: usuario => this.ngZone.run(() => {
        this.usuario = usuario;
        this.salvandoTransferencia = false;
        this.modalTransferenciaAberto = false;
        this.toastr.success('Usuário matriculado novamente com sucesso.', 'Sucesso');
        this.atualizarTela();
      }),
      error: err => this.ngZone.run(() => {
        this.salvandoTransferencia = false;
        if (this.erroJaExibidoPeloInterceptor(err)) {
          this.atualizarTela();
          return;
        }
        this.toastr.error(err.error?.message || 'Não foi possível matricular o usuário novamente.', 'Erro');
        this.atualizarTela();
      })
    });
  }


  async excluirUsuario(): Promise<void> {
    const usuario = this.usuario;
    if (!usuario?.id || this.monitor) return;

    if (!this.sessao.podeExcluirUsuario(usuario.idUnidade)) {
      this.toastr.error('Você não tem acesso à unidade deste usuário.', 'Acesso negado');
      return;
    }

    const confirmado = await this.confirmarAcaoCritica(
      'Confirmar exclusão?',
      'Este usuário e seus dados serão excluídos permanentemente.',
      'excluir-usuario',
      'Excluir usuário',
      'warning',
      '#e04b3a'
    );
    if (!confirmado) return;

    this.usuarioService.deletar(usuario.id).subscribe({
      next: () => this.ngZone.run(() => {
        this.toastr.success('Usuário excluído com sucesso.', 'Sucesso');
        this.router.navigate(['/dashboard/usuarios']);
        return;
      }),
      error: (err) => this.ngZone.run(() => {
        if (this.erroJaExibidoPeloInterceptor(err)) return;
        this.toastr.error(err.error?.message || 'Não foi possível excluir o usuário.', 'Erro');
      })
    });
  }

  private async confirmarAcaoCritica(
    titulo: string,
    mensagem: string,
    textoConfirmacao: string,
    botaoConfirmar: string,
    icone: 'warning' | 'question' = 'warning',
    confirmButtonColor = '#3682dc'
  ): Promise<boolean> {
    const resultado = await Swal.fire({
      title: titulo,
      html: `${this.escaparHtml(mensagem)}<br><br>Digite <em>"${this.escaparHtml(textoConfirmacao)}"</em> para confirmar.`,
      icon: icone,
      input: 'text',
      inputPlaceholder: textoConfirmacao,
      showCancelButton: true,
      confirmButtonText: botaoConfirmar,
      cancelButtonText: 'Cancelar',
      confirmButtonColor,
      cancelButtonColor: '#757575',
      reverseButtons: true,
      inputValidator: valor => valor?.trim() === textoConfirmacao
        ? undefined
        : `Digite exatamente: ${textoConfirmacao}`
    });

    return resultado.isConfirmed;
  }

  private carregarUnidadesTransferencia(): void {
    if (this.unidadesTransferencia.length) return;

    this.carregandoUnidadesTransferencia = true;
    this.unidadeService.listarTodas().subscribe({
      next: unidades => this.ngZone.run(() => {
        this.unidadesTransferencia = unidades;
        this.carregandoUnidadesTransferencia = false;
        this.atualizarTela();
      }),
      error: () => this.ngZone.run(() => {
        this.carregandoUnidadesTransferencia = false;
        this.toastr.error('Não foi possível carregar as unidades.', 'Erro');
        this.atualizarTela();
      })
    });
  }

  private carregarTurmasTransferencia(idUnidade: number): void {
    this.carregandoTurmasTransferencia = true;
    this.turmaService.listar(idUnidade).subscribe({
      next: turmas => this.ngZone.run(() => {
        this.turmasTransferencia = turmas.filter(turma => turma.unidade.id === idUnidade);
        this.carregandoTurmasTransferencia = false;
        this.formTransferencia.get('idTurmaNova')?.enable();
        this.atualizarTela();
      }),
      error: () => this.ngZone.run(() => {
        this.carregandoTurmasTransferencia = false;
        this.toastr.error('Não foi possível carregar as turmas.', 'Erro');
        this.atualizarTela();
      })
    });
  }

  private calcularIdade(valor?: string | null): number | null {
    if (!valor) return null;
    const [ano, mes, dia] = valor.split('T')[0].split('-').map(Number);
    if (!ano || !mes || !dia) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - ano;
    const aniversarioAindaNaoChegou = hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
    if (aniversarioAindaNaoChegou) idade--;
    return idade >= 0 ? idade : null;
  }

  private formatarMesAno(valor: string): string {
    const data = new Date(`${valor.split('T')[0]}T00:00:00`);
    if (Number.isNaN(data.getTime())) return 'não informado';
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(data);
  }

  private formatarDataCurta(valor: string): string {
    const data = new Date(`${valor.split('T')[0]}T00:00:00`);
    if (Number.isNaN(data.getTime())) return 'não informado';
    const partes = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).formatToParts(data);
    const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(item => item.type === tipo)?.value || '';
    return `${parte('day')} ${parte('month')} ${parte('year')}`;
  }

  private formatarDataNascimentoCurta(valor?: string | null): string {
    if (!valor) return 'não informada';
    const data = new Date(`${valor.split('T')[0]}T00:00:00`);
    if (Number.isNaN(data.getTime())) return 'não informada';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(data).replace(' de ', ' ').replace(' de ', ' ');
  }

  private formatarTurma(valor?: string | null): string {
    if (!valor) return 'Turma não informada';
    const normalizado = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (normalizado.includes('MANHA')) return 'Manhã';
    if (normalizado.includes('TARDE')) return 'Tarde';
    return valor;
  }

  private formatarPeriodoTurma(valor?: string | null): string {
    if (valor === 'MANHA') return 'Manhã';
    if (valor === 'TARDE') return 'Tarde';
    return valor || 'período não informado';
  }

  private formatarPeriodoEscolar(valor?: string | null): string {
    if (valor === 'MANHA') return 'manhã';
    if (valor === 'TARDE') return 'tarde';
    return 'mesmo período';
  }

  private escaparHtml(valor: string): string {
    return valor.replace(/[&<>'"]/g, caractere => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[caractere] || caractere);
  }

  private erroJaExibidoPeloInterceptor(erro: { status?: number }): boolean {
    return erro.status === 401 || erro.status === 403;
  }

  private obterUrlArquivo(valor?: string | null): string | null {
    if (!valor) return null;
    if (valor.startsWith('http://') || valor.startsWith('https://') || valor.startsWith('data:') || valor.startsWith('/images/')) {
      return valor;
    }
    return `${environment.apiUrl}${valor}`;
  }

  private atualizarTela(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
