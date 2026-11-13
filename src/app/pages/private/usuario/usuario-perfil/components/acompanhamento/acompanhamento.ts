import { MatIconModule } from '@angular/material/icon';
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
  imports: [MatIconModule, AcompanhamentoFrequencias, AcompanhamentoOcorrencias, AcompanhamentoEntrevistas, ExportarAcompanhamento],
  template: `
    <header class="titulo-aba">
      <h2>Acompanhamento</h2>
      <button type="button" class="btn-exportar" (click)="exportando.set(true)">
        <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">file_export</mat-icon>
        Relatório
      </button>
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
.btn-exportar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  background: var(--branco);
  color: var(--primary-color);
  cursor: pointer;
  font-family: var(--fonte-texto);
  font-size: 0.95rem;
  font-weight: 600;
}

.btn-exportar:hover:not(:disabled) {
  background: #f3f8fe;
}

.btn-exportar:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.btn-exportar:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
    @media (max-width: 600px) {
      .titulo-aba { flex-direction: column; align-items: stretch; }
      .btn-exportar { width: 100%; }
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
