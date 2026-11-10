import { Component, Input, OnDestroy, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { MatriculaHistoricoDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { AcompanhamentoService } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { obterNomeDownload } from 'src/app/shared/utils/arquivo-acesso';
import { PERIODOS_FREQUENCIA, PeriodoFrequencia, hojeBrasilia, intervaloPeriodo, validarIntervalo } from '../frequencias/periodos-frequencia';

@Component({
  selector: 'app-exportar-acompanhamento',
  standalone: true,
  imports: [ReactiveFormsModule, ModalLayout, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './exportar-acompanhamento.html',
  styleUrl: './exportar-acompanhamento.css',
})
export class ExportarAcompanhamento implements OnInit, OnDestroy {
  @Input({ required: true }) usuario!: UsuarioResponseDTO;
  @Output() closed = new EventEmitter<void>();

  private readonly service = inject(AcompanhamentoService);
  private readonly sessao = inject(SessaoService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  private geracao?: Subscription;
  private consultaMatriculas?: Subscription;

  readonly periodos = PERIODOS_FREQUENCIA;
  readonly form = this.fb.nonNullable.group({
    periodo: this.fb.nonNullable.control<PeriodoFrequencia>('ESTE_ANO'),
    matricula: this.fb.nonNullable.control(0),
    dataInicio: this.fb.nonNullable.control(''),
    dataFim: this.fb.nonNullable.control(''),
  });
  readonly matriculas = signal<MatriculaHistoricoDTO[]>([]);
  readonly carregandoMatriculas = signal(false);
  readonly erroMatriculas = signal<string | null>(null);
  readonly gerando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroPeriodo = signal<string | null>(null);

  get incluiEntrevistas(): boolean { return this.sessao.isAdministrador() || this.sessao.isCoordenador(); }

  ngOnInit(): void {
    this.form.patchValue(intervaloPeriodo('ESTE_ANO', hojeBrasilia()));
    this.carregarMatriculas();
    this.form.valueChanges.subscribe(() => { this.erro.set(null); this.erroPeriodo.set(null); });
  }

  ngOnDestroy(): void { this.geracao?.unsubscribe(); this.consultaMatriculas?.unsubscribe(); }

  carregarMatriculas(): void {
    this.consultaMatriculas?.unsubscribe();
    this.carregandoMatriculas.set(true); this.erroMatriculas.set(null);
    this.consultaMatriculas = this.service.matriculasFrequencia(this.usuario.id).subscribe({
      next: matriculas => { this.matriculas.set(matriculas); this.carregandoMatriculas.set(false); },
      error: () => {
        this.erroMatriculas.set('Não foi possível carregar as matrículas.'); this.carregandoMatriculas.set(false);
      },
    });
  }

  alterarPeriodo(): void {
    const periodo = this.form.controls.periodo.value;
    if (periodo === 'PERSONALIZADO') return;
    this.form.patchValue(intervaloPeriodo(periodo, hojeBrasilia()));
  }

  dataLegivel(data: string): string { return data.slice(0, 10).split('-').reverse().join('/'); }

  rotuloMatricula(m: MatriculaHistoricoDTO): string {
    const hora = (valor: string) => String(valor).slice(0, 5);
    const periodo = m.periodoTurma === 'MANHA' ? 'Manhã' : 'Tarde';
    return `${m.nomeUnidade} - ${periodo} (${hora(m.horaInicio)} - ${hora(m.horaFim)}) · vínculo de `
      + `${this.dataLegivel(m.dataIngresso)} a ${m.dataDesligamento ? this.dataLegivel(m.dataDesligamento) : 'hoje'}`;
  }

  gerar(): void {
    if (this.gerando()) return;
    const filtros = this.form.getRawValue();
    const erroPeriodo = validarIntervalo(filtros.dataInicio, filtros.dataFim);
    this.erroPeriodo.set(erroPeriodo);
    if (erroPeriodo) return;

    this.gerando.set(true); this.erro.set(null);
    this.geracao = this.service.exportarRelatorio(this.usuario.id, {
      inicio: filtros.dataInicio, fim: filtros.dataFim, matricula: filtros.matricula || null,
    }).subscribe({
      next: resposta => {
        this.gerando.set(false);
        if (!resposta.body?.size) { this.erro.set('O arquivo gerado veio vazio. Tente novamente.'); return; }
        this.baixar(resposta);
        this.toastr.success('Relatório gerado com sucesso.');
      },
      error: async (erro: unknown) => { this.erro.set(await this.mensagemErro(erro)); this.gerando.set(false); },
    });
  }

  cancelar(): void { this.geracao?.unsubscribe(); this.closed.emit(); }

  private baixar(resposta: HttpResponse<Blob>): void {
    const blob = resposta.body!;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = obterNomeDownload(resposta.headers.get('Content-Disposition'), 'acompanhamento', '', blob.type);
    link.hidden = true;
    link.addEventListener('click', evento => evento.stopPropagation());
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  private async mensagemErro(erro: unknown): Promise<string> {
    if (erro instanceof HttpErrorResponse) {
      if (erro.status === 0) return 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.';
      try {
        const corpo = erro.error instanceof Blob ? JSON.parse(await erro.error.text()) : erro.error;
        if (corpo?.message) return corpo.message;
      } catch { /* usa a mensagem padrão */ }
      if (erro.status === 403) return 'Você não possui permissão para exportar o acompanhamento deste usuário.';
    }
    return 'Não foi possível gerar o relatório. Tente novamente.';
  }
}
