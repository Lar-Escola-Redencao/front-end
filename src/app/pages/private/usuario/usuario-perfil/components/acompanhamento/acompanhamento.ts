import { Component, Input, ViewChild, inject } from '@angular/core';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { AcompanhamentoOcorrencias } from './ocorrencias/ocorrencias';
import { AcompanhamentoEntrevistas } from './entrevistas/entrevistas';
import { AcompanhamentoFrequencias } from './frequencias/frequencias';

@Component({
  selector: 'app-usuario-perfil-acompanhamento',
  standalone: true,
  imports: [AcompanhamentoFrequencias, AcompanhamentoOcorrencias, AcompanhamentoEntrevistas],
  template: `
    <app-acompanhamento-frequencias [usuario]="usuario" />
    <app-acompanhamento-ocorrencias [usuario]="usuario" />
    @if (sessao.isAdministrador() || sessao.isCoordenador()) {
      <app-acompanhamento-entrevistas [usuario]="usuario" />
    }
  `,
  styles: [':host { display: grid; gap: 36px; min-width: 0; }'],
})
export class UsuarioPerfilAcompanhamento {
  @Input({ required: true }) usuario!: UsuarioResponseDTO;
  readonly sessao = inject(SessaoService);
  @ViewChild(AcompanhamentoOcorrencias) private ocorrencias?: AcompanhamentoOcorrencias;
  @ViewChild(AcompanhamentoEntrevistas) private entrevistas?: AcompanhamentoEntrevistas;
  get temAlteracoes(): boolean { return !!(this.ocorrencias?.temAlteracoes || this.entrevistas?.temAlteracoes); }
  get salvando(): boolean { return !!(this.ocorrencias?.salvando() || this.entrevistas?.salvando()); }
  formularioTemAlteracoesNaoSalvas(): boolean { return this.temAlteracoes || this.salvando; }
  cancelar(): void { this.ocorrencias?.cancelar(); this.entrevistas?.cancelar(); }
}
