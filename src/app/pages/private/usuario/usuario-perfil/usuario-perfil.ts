import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subscription, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { Turma } from 'src/app/shared/models/turma.model';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { ModalLayout } from 'src/app/components/modal-layout/modal-layout';
import { UsuarioPerfilAbaPlaceholder } from './components/aba-placeholder/aba-placeholder';
import { UsuarioPerfilContatos } from './components/contatos/contatos';
import { UsuarioPerfilDadosPessoais } from './components/dados-pessoais/dados-pessoais';
import { UsuarioPerfilDadosSocioeconomicos } from './components/dados-socioeconomicos/dados-socioeconomicos';
import { UsuarioPerfilSaude } from './components/saude/saude';

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
    UsuarioPerfilSaude
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
  private sub?: Subscription;

  usuario: UsuarioResponseDTO | null = null;
  carregando = true;
  erro = '';
  abaAtiva: AbaPerfil = 'acompanhamento';
  modalDesligamentoAberto = false;
  modalTransferenciaAberto = false;
  salvandoDesligamento = false;
  salvandoTransferencia = false;
  carregandoUnidadesTransferencia = false;
  carregandoTurmasTransferencia = false;
  unidadesTransferencia: Unidade[] = [];
  turmasTransferencia: Turma[] = [];

  readonly formDesligamento = this.fb.group({
    justificativa: ['', Validators.required]
  });

  readonly formTransferencia = this.fb.group({
    idUnidade: this.fb.control<number | null>(null, Validators.required),
    idTurmaNova: this.fb.control<number | null>({ value: null, disabled: true }, Validators.required)
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
    this.carregarPerfil();
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
        return this.usuarioService.buscarPorId(Number(params.get('id')));
      })
    ).subscribe({
      next: usuario => {
        this.ngZone.run(() => {
          this.usuario = usuario;
          this.carregando = false;
          this.atualizarTela();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.erro = 'Não foi possível carregar o perfil do usuário.';
          this.carregando = false;
          this.atualizarTela();
        });
      }
    });
  }

  selecionarAba(aba: AbaPerfil): void {
    this.abaAtiva = aba;
  }

  atualizarUsuario(usuario: UsuarioResponseDTO): void {
    this.usuario = usuario;
  }

  voltarParaUsuarios(): void {
    this.router.navigate(['/dashboard/usuarios']);
  }

  get fotoPerfil(): string | null {
    return this.obterUrlArquivo(this.usuario?.imagemPerfil);
  }

  get idade(): string {
    const anos = this.calcularIdade(this.usuario?.dataNascimento);
    if (anos === null) return 'Idade não informada';
    return `${anos.toString().padStart(2, '0')} anos (${this.formatarDataNascimentoCurta(this.usuario?.dataNascimento)})`;
  }

  get desde(): string {
    return this.usuario?.dataIngresso ? `Desde ${this.formatarMesAno(this.usuario.dataIngresso)}` : 'Desde não informado';
  }

  get turma(): string {
    return this.formatarTurma(this.usuario?.nomeTurma);
  }

  get desligado(): boolean {
    const status = (this.usuario?.statusMatricula || this.usuario?.status || '').toString().toUpperCase();
    return status === 'EGRESSO';
  }

  abrirModalDesligamento(): void {
    if (!this.usuario?.id || this.desligado) return;
    this.formDesligamento.reset({ justificativa: '' });
    this.modalDesligamentoAberto = true;
  }

  fecharModalDesligamento(): void {
    if (this.salvandoDesligamento) return;
    this.modalDesligamentoAberto = false;
  }

  async confirmarDesligamento(): Promise<void> {
    if (!this.usuario?.id || this.desligado) return;

    this.formDesligamento.markAllAsTouched();
    const justificativa = this.formDesligamento.value.justificativa?.trim() || '';
    if (this.formDesligamento.invalid || !justificativa) return;

    const resultado = await Swal.fire({
      title: 'Confirmar desligamento?',
      text: 'O usuário será removido do diário atual, mas poderá ser matriculado novamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar desligamento',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3682dc',
      cancelButtonColor: '#757575',
      reverseButtons: true
    });

    if (!resultado.isConfirmed) return;

    const usuarioAtual = this.usuario;
    const dataDesligamento = new Date().toISOString().slice(0, 10);
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
        this.atualizarTela();
      }),
      error: (err) => this.ngZone.run(() => {
        this.salvandoDesligamento = false;
        Swal.fire('Erro', err.error?.message || 'Não foi possível desligar o usuário.', 'error');
        this.atualizarTela();
      })
    });
  }

  abrirModalTransferencia(): void {
    if (!this.usuario?.id || this.desligado) return;

    this.formTransferencia.reset({
      idUnidade: this.usuario.idUnidade || null,
      idTurmaNova: null
    });
    this.formTransferencia.get('idTurmaNova')?.disable();
    this.turmasTransferencia = [];
    this.modalTransferenciaAberto = true;

    this.carregarUnidadesTransferencia();
    if (this.usuario.idUnidade) {
      this.carregarTurmasTransferencia(this.usuario.idUnidade);
    }
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
    return this.turmasTransferencia.filter(turma => turma.id !== this.usuario?.idTurma);
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

    const mesmaUnidade = turma.unidade.id === this.usuario.idUnidade;
    const periodo = this.formatarPeriodoTurma(turma.periodo).toLowerCase();
    const texto = mesmaUnidade
      ? `Você está trocando o turno do usuário para ${periodo}.`
      : `Você está transferindo o aluno para a unidade ${turma.unidade.nome} no período ${periodo}.`;

    const resultado = await Swal.fire({
      title: 'Confirmar transferência?',
      text: texto,
      icon: mesmaUnidade ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar transferência',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3682dc',
      cancelButtonColor: '#757575',
      reverseButtons: true
    });

    if (!resultado.isConfirmed) return;

    this.salvandoTransferencia = true;
    this.usuarioService.transferirTurma(this.usuario.id, turma.id).subscribe({
      next: usuario => this.ngZone.run(() => {
        this.usuario = usuario;
        this.salvandoTransferencia = false;
        this.modalTransferenciaAberto = false;
        this.atualizarTela();
      }),
      error: (err) => this.ngZone.run(() => {
        this.salvandoTransferencia = false;
        Swal.fire('Erro', err.error?.message || 'Não foi possível transferir o usuário.', 'error');
        this.atualizarTela();
      })
    });
  }

  matricularNovamente(): void {
    if (!this.usuario?.id) return;
    this.router.navigate(['/dashboard/usuarios'], {
      queryParams: { rematricular: this.usuario.id }
    });
  }

  async excluirUsuario(): Promise<void> {
    const usuario = this.usuario;
    if (!usuario?.id) return;

    if (!this.sessao.podeExcluirUsuario(usuario.idUnidade)) {
      await Swal.fire('Acesso negado', 'Você não tem acesso à unidade deste usuário.', 'warning');
      return;
    }

    const confirmado = await Alertas.confirmarExclusao('Este usuário e seus dados serão excluídos permanentemente.');
    if (!confirmado) return;

    this.usuarioService.deletar(usuario.id).subscribe({
      next: () => this.ngZone.run(async () => {
        await Swal.fire('Usuário excluído', 'O usuário foi excluído com sucesso.', 'success');
        this.router.navigate(['/dashboard/usuarios']);
      }),
      error: (err) => this.ngZone.run(() => {
        Swal.fire('Erro', err.error?.message || 'Não foi possível excluir o usuário.', 'error');
      })
    });
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
        Swal.fire('Erro', 'Não foi possível carregar as unidades.', 'error');
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
        Swal.fire('Erro', 'Não foi possível carregar as turmas.', 'error');
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
