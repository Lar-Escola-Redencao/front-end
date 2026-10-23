import { Injectable, inject } from '@angular/core';
import { ActiveToast, IndividualConfig, ToastrService } from 'ngx-toastr';
import { HistoricoAtualizacoesService } from './historico-atualizacoes.service';

@Injectable()
export class ToastrHistoricoService extends ToastrService {
  private readonly atualizacoes = inject(HistoricoAtualizacoesService);

  override success<ConfigPayload = unknown>(
    mensagem?: string,
    titulo?: string,
    configuracao?: Partial<IndividualConfig<ConfigPayload>>
  ): ActiveToast<unknown> {
    const aviso = super.success(mensagem, titulo, configuracao);
    this.atualizacoes.sucesso.next();
    return aviso;
  }
}
