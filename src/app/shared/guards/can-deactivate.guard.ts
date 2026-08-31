import { CanDeactivateFn } from '@angular/router';
import { Alertas } from '../utils/alerts';

export interface ComponentComAlteracoesNaoSalvas {
  formularioTemAlteracoesNaoSalvas(): boolean;
}

export const canDeactivateGuard: CanDeactivateFn<ComponentComAlteracoesNaoSalvas> = (component) => {
  if (!component.formularioTemAlteracoesNaoSalvas()) {
    return true;
  }
  return Alertas.confirmarDescarte();
};