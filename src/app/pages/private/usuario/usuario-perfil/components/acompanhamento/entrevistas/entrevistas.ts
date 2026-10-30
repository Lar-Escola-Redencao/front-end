import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { ModalLayout } from 'src/app/components/modal-layout/modal-layout';
import { BarraBusca } from 'src/app/components/barra-busca/barra-busca';
import { Paginacao } from 'src/app/components/paginacao/paginacao';
import { TabelaLayout, TabelaColuna, TabelaAcao } from 'src/app/components/tabela-layout/tabela-layout';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { AcompanhamentoService, Entrevista } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { ListaPaginada } from '../compartilhado/lista-paginada';
import { AjudaAcompanhamento } from '../compartilhado/ajuda-acompanhamento';

function validarInstanteEntrevista(form: AbstractControl): ValidationErrors | null {
  const data = form.get('data')?.value as string;
  const horario = form.get('horario')?.value as string;
  if (!data || !horario) return null;
  // Os horários do formulário e da API representam Brasília, como no Diário.
  const instante = Date.parse(`${data}T${horario}:00-03:00`);
  if (!Number.isFinite(instante)) return { dataHoraInvalida: true };
  return instante > Date.now() ? { dataHoraFutura: true } : null;
}

@Component({
  selector: 'app-acompanhamento-entrevistas', standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule,
    ModalLayout, BarraBusca, Paginacao, TabelaLayout, AjudaAcompanhamento],
  templateUrl: './entrevistas.html', styleUrl: '../compartilhado/acompanhamento.css',
})
export class AcompanhamentoEntrevistas implements OnChanges, OnDestroy {
  @Input({ required: true }) usuario!: UsuarioResponseDTO;
  private readonly service = inject(AcompanhamentoService);
  readonly sessao = inject(SessaoService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  private operacao?: Subscription;
  readonly lista = new ListaPaginada<Entrevista>((p, t, b) => this.service.entrevistas(this.usuario.id, p, t, b));
  readonly modal = signal<'NOVO' | 'EDITAR' | 'VER' | null>(null);
  readonly selecionada = signal<Entrevista | null>(null);
  readonly salvando = signal(false);
  readonly erro = signal('');
  readonly form = this.fb.nonNullable.group({
    data: ['', Validators.required], horario: ['', Validators.required],
    relato: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20000)]],
  }, { validators: validarInstanteEntrevista });
  private inicial = '';
  readonly colunas: TabelaColuna<Entrevista>[] = [
    { chave: 'dataEntrevista', titulo: 'Data da entrevista', principalMobile: true, formatar: v => this.formatarData(v) },
    { chave: 'relato', titulo: 'Descrição' },
  ];
  readonly acoes: TabelaAcao<Entrevista>[] = [
    { acao: 'visualizar', icone: 'visibility', tooltip: 'Visualizar', executar: e => this.abrir('VER', e) },
    { acao: 'editar', icone: 'edit', tooltip: 'Editar', executar: e => this.abrir('EDITAR', e) },
    { acao: 'excluir', icone: 'delete', tooltip: 'Excluir', executar: e => void this.excluir(e) },
  ];

  ngOnChanges(): void { this.cancelar(); this.lista.reiniciar(); }
  ngOnDestroy(): void { this.lista.destruir(); this.operacao?.unsubscribe(); }
  get temAlteracoes(): boolean {
    return (this.modal() === 'NOVO' || this.modal() === 'EDITAR') && JSON.stringify(this.form.getRawValue()) !== this.inicial;
  }
  get responsavel(): string { return this.selecionada()?.nomeResponsavel ?? this.sessao.membro()?.nomeCompleto ?? '-'; }

  abrir(modo: 'NOVO' | 'EDITAR' | 'VER', entrevista: Entrevista | null = null): void {
    if (this.salvando()) return;
    this.selecionada.set(entrevista);
    this.form.enable();
    this.form.reset({ data: entrevista?.dataEntrevista.slice(0, 10) ?? '',
      horario: entrevista?.dataEntrevista.slice(11, 16) ?? '', relato: entrevista?.relato ?? '' });
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
    if (this.salvando() || this.modal() === 'VER' || !this.modal()) return;
    this.form.updateValueAndValidity();
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const dados = this.form.getRawValue();
    this.salvando.set(true); this.form.disable(); this.erro.set('');
    this.operacao = this.service.salvarEntrevista(this.usuario.id, this.selecionada()?.id ?? null,
      { dataEntrevista: `${dados.data}T${dados.horario}:00`, relato: dados.relato.trim() }).subscribe({
      next: () => { this.salvando.set(false); this.cancelar(); this.toastr.success('Entrevista salva.'); this.lista.carregar(); },
      error: (e: { error?: { message?: string } }) => {
        this.salvando.set(false); this.form.enable();
        this.erro.set(e.error?.message ?? 'Não foi possível salvar a entrevista. Tente novamente.');
      },
    });
  }

  async excluir(entrevista: Entrevista): Promise<void> {
    if (this.salvando() || !await Alertas.confirmarExclusao('Deseja excluir esta entrevista?') || this.salvando()) return;
    this.salvando.set(true);
    this.operacao = this.service.excluirEntrevista(this.usuario.id, entrevista.id).subscribe({
      next: () => { this.salvando.set(false); this.toastr.success('Entrevista excluída.'); this.lista.carregar(); },
      error: () => { this.salvando.set(false); this.toastr.error('Não foi possível excluir a entrevista.'); },
    });
  }

  abrirCalendario(input: HTMLInputElement): void { input.showPicker?.(); }
  abrirSeletorHora(input: HTMLInputElement): void {
    if (input.disabled) return;
    try {
      if (typeof input.showPicker === 'function') { input.showPicker(); return; }
    } catch {
      // Mantém o campo acessível quando o navegador não permite abrir o seletor.
    }
    input.focus(); input.click();
  }
  formatarData(valor: string): string {
    const [data, hora] = valor.split('T'); return `${data.split('-').reverse().join('/')} às ${hora?.slice(0, 5).replace(':', 'h') ?? ''}`;
  }
}
