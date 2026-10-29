import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { ModalLayout } from 'src/app/components/modal-layout/modal-layout';
import { BarraBusca } from 'src/app/components/barra-busca/barra-busca';
import { Paginacao } from 'src/app/components/paginacao/paginacao';
import { TabelaLayout, TabelaColuna, TabelaAcao } from 'src/app/components/tabela-layout/tabela-layout';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { AcompanhamentoService, OcorrenciaAcompanhamento } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { DiarioService, OcorrenciaResponseDTO } from 'src/app/shared/services/diario/diario.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { ListaPaginada } from './lista-paginada';
import { AjudaAcompanhamento } from './ajuda-acompanhamento';

@Component({
  selector: 'app-acompanhamento-ocorrencias', standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatIconModule, ModalLayout, BarraBusca, Paginacao, TabelaLayout, AjudaAcompanhamento],
  templateUrl: './ocorrencias.html', styleUrl: './acompanhamento.css',
})
export class AcompanhamentoOcorrencias implements OnChanges, OnDestroy {
  @Input({ required: true }) usuario!: UsuarioResponseDTO;
  private readonly service = inject(AcompanhamentoService);
  private readonly diario = inject(DiarioService);
  private readonly sessao = inject(SessaoService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  private operacao?: Subscription;
  readonly lista = new ListaPaginada<OcorrenciaAcompanhamento>((p, t, b) => this.service.ocorrencias(this.usuario.id, p, t, b));
  readonly modal = signal<'NOVO' | 'EDITAR' | 'VER' | null>(null);
  readonly selecionada = signal<OcorrenciaAcompanhamento | null>(null);
  readonly salvando = signal(false);
  readonly erro = signal('');
  readonly tipos = [
    { valor: 'COMPORTAMENTO', nome: 'Comportamento' }, { valor: 'SAUDE', nome: 'Saúde' },
    { valor: 'ASSISTENCIA', nome: 'Assistência' }, { valor: 'OUTRO', nome: 'Outro' },
  ];
  readonly form = this.fb.nonNullable.group({
    data: ['', Validators.required], horario: ['', Validators.required],
    tipoOcorrencia: ['', Validators.required], descricao: ['', [Validators.required, Validators.pattern(/\S/)]],
  });
  private inicial = '';
  readonly colunas: TabelaColuna<OcorrenciaAcompanhamento>[] = [
    { chave: 'dataOcorrencia', titulo: 'Data da ocorrência', principalMobile: true, formatar: v => this.formatarData(v) },
    { chave: 'tipoOcorrencia', titulo: 'Tipo', formatar: v => this.nomeTipo(v) },
    { chave: 'descricao', titulo: 'Descrição' },
  ];
  readonly acoes: TabelaAcao<OcorrenciaAcompanhamento>[] = [
    { acao: 'visualizar', icone: 'visibility', tooltip: 'Visualizar', executar: o => this.abrir('VER', o) },
    { acao: 'editar', icone: 'edit', tooltip: 'Editar', visivel: o => this.podeAlterar(o), executar: o => this.abrir('EDITAR', o) },
    { acao: 'excluir', icone: 'delete', tooltip: 'Excluir', visivel: o => this.podeAlterar(o), executar: o => void this.excluir(o) },
  ];

  ngOnChanges(): void { this.cancelar(); this.lista.reiniciar(); }
  ngOnDestroy(): void { this.lista.destruir(); this.operacao?.unsubscribe(); }
  get temAlteracoes(): boolean {
    return (this.modal() === 'NOVO' || this.modal() === 'EDITAR') && JSON.stringify(this.form.getRawValue()) !== this.inicial;
  }
  podeAlterar(ocorrencia: OcorrenciaResponseDTO): boolean {
    if (this.sessao.isAdministrador() || this.sessao.isCoordenador()) return true;
    // dataCriacao é um horário local de Brasília, como no Diário.
    const decorrido = Date.now() - new Date(ocorrencia.dataCriacao + '-03:00').getTime();
    return this.sessao.isMonitor() && ocorrencia.idMembro === this.sessao.membro()?.id
      && decorrido >= 0 && decorrido <= 24 * 60 * 60 * 1000;
  }

  abrir(modo: 'NOVO' | 'EDITAR' | 'VER', ocorrencia: OcorrenciaAcompanhamento | null = null): void {
    if (this.salvando() || (modo === 'EDITAR' && (!ocorrencia || !this.podeAlterar(ocorrencia)))) return;
    this.selecionada.set(ocorrencia); this.form.enable();
    this.form.reset({ data: ocorrencia?.dataOcorrencia.slice(0, 10) ?? '',
      horario: ocorrencia?.dataOcorrencia.slice(11, 16) ?? '',
      tipoOcorrencia: ocorrencia?.tipoOcorrencia ?? '', descricao: ocorrencia?.descricao ?? '' });
    if (modo === 'EDITAR') this.form.controls.data.disable();
    this.inicial = JSON.stringify(this.form.getRawValue());
    this.erro.set(''); this.modal.set(modo);
  }

  async fechar(): Promise<void> {
    if (this.salvando()) return;
    if (this.temAlteracoes && !await Alertas.confirmarDescarte()) return;
    this.cancelar();
  }
  cancelar(): void { if (!this.salvando()) { this.modal.set(null); this.erro.set(''); } }

  salvar(): void {
    const ocorrencia = this.selecionada();
    if (this.salvando() || this.modal() !== 'EDITAR' || !ocorrencia) return;
    if (!this.podeAlterar(ocorrencia)) { this.erro.set('O prazo para alterar esta ocorrência foi encerrado.'); return; }
    this.form.markAllAsTouched(); if (this.form.invalid) return;
    const dados = this.form.getRawValue();
    this.salvando.set(true); this.form.disable(); this.erro.set('');
    this.operacao = this.diario.atualizarOcorrencia(ocorrencia.id, {
      dataOcorrencia: `${dados.data}T${dados.horario}:00`, tipoOcorrencia: dados.tipoOcorrencia,
      descricao: dados.descricao.trim(),
    }).subscribe({
      next: () => { this.salvando.set(false); this.cancelar(); this.toastr.success('Ocorrência atualizada.'); this.lista.carregar(); },
      error: (e: { error?: { message?: string } }) => {
        this.salvando.set(false); this.form.enable(); this.form.controls.data.disable();
        this.erro.set(e.error?.message ?? 'Não foi possível salvar a ocorrência. Tente novamente.');
      },
    });
  }

  async excluir(ocorrencia: OcorrenciaAcompanhamento): Promise<void> {
    if (this.salvando() || !this.podeAlterar(ocorrencia) || !await Alertas.confirmarExclusao('Deseja excluir esta ocorrência?')) return;
    if (this.salvando() || !this.podeAlterar(ocorrencia)) return;
    this.salvando.set(true);
    this.operacao = this.diario.deletarOcorrencia(ocorrencia.id).subscribe({
      next: () => { this.salvando.set(false); this.toastr.success('Ocorrência excluída.'); this.lista.carregar(); },
      error: () => { this.salvando.set(false); this.toastr.error('Não foi possível excluir a ocorrência.'); },
    });
  }

  abrirCalendario(input: HTMLInputElement): void { if (!input.disabled) input.showPicker?.(); }
  abrirSeletorHora(input: HTMLInputElement): void {
    if (input.disabled) return;
    try {
      if (typeof input.showPicker === 'function') { input.showPicker(); return; }
    } catch {
      // Mantém o campo acessível quando o navegador não permite abrir o seletor.
    }
    input.focus(); input.click();
  }
  nomeTipo(tipo: string): string { return this.tipos.find(t => t.valor === tipo)?.nome ?? tipo; }
  formatarData(valor: string): string {
    const [data, hora] = valor.split('T'); return `${data.split('-').reverse().join('/')} às ${hora?.slice(0, 5).replace(':', 'h') ?? ''}`;
  }
}
