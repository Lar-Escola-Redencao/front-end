import { Component, Input, ViewChild, inject, signal } from '@angular/core';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { AcompanhamentoOcorrencias } from './ocorrencias/ocorrencias';
import { AcompanhamentoEntrevistas } from './entrevistas/entrevistas';
import { AcompanhamentoFrequencias } from './frequencias/frequencias';
import { ExportarAcompanhamento } from './exportar/exportar-acompanhamento';

@Component({
  selector: 'app-usuario-perfil-acompanhamento',
  standalone: true,
  imports: [AcompanhamentoFrequencias, AcompanhamentoOcorrencias, AcompanhamentoEntrevistas, ExportarAcompanhamento],
  template: `
    <header class="titulo-aba">
      <h2>Acompanhamento</h2>
      <button type="button" class="btn-primary" (click)="exportando.set(true)">Exportar relatório</button>
    </header>
    <app-acompanhamento-frequencias [usuario]="usuario" />
    <app-acompanhamento-ocorrencias [usuario]="usuario" />
    @if (sessao.isAdministrador() || sessao.isCoordenador()) {
      <app-acompanhamento-entrevistas [usuario]="usuario" />
    }
    @if (exportando()) {
      <app-exportar-acompanhamento [usuario]="usuario" (closed)="exportando.set(false)" />
    }
  `,
  styles: [`
    :host { display: grid; gap: 36px; min-width: 0; }
    .titulo-aba { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: -12px; }
    .titulo-aba h2 { margin: 0; font: 700 1.5rem var(--fonte-titulo); }
    @media (max-width: 600px) {
      .titulo-aba { flex-direction: column; align-items: stretch; }
      .titulo-aba button { width: 100%; }
    }
  `],
})
export class UsuarioPerfilAcompanhamento {
  @Input({ required: true }) usuario!: UsuarioResponseDTO;
  readonly sessao = inject(SessaoService);
  readonly exportando = signal(false);
  @ViewChild(AcompanhamentoOcorrencias) private ocorrencias?: AcompanhamentoOcorrencias;
  @ViewChild(AcompanhamentoEntrevistas) private entrevistas?: AcompanhamentoEntrevistas;
  get temAlteracoes(): boolean { return !!(this.ocorrencias?.temAlteracoes || this.entrevistas?.temAlteracoes); }
  get salvando(): boolean { return !!(this.ocorrencias?.salvando() || this.entrevistas?.salvando()); }
  formularioTemAlteracoesNaoSalvas(): boolean { return this.temAlteracoes || this.salvando; }
  cancelar(): void { this.ocorrencias?.cancelar(); this.entrevistas?.cancelar(); }
}
