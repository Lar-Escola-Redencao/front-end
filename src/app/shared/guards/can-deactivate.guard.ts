import { CanDeactivateFn } from '@angular/router';
import Swal from 'sweetalert2';

export interface ComponentComAlteracoesNaoSalvas {
  formularioTemAlteracoesNaoSalvas(): boolean;
}

export const canDeactivateGuard: CanDeactivateFn<ComponentComAlteracoesNaoSalvas> = (component) => {
  if (!component.formularioTemAlteracoesNaoSalvas()) {
    return true;
  }

  return Swal.fire({
    title: 'Alterações não salvas',
    text: 'Você tem um formulário aberto com alterações não salvas. Deseja sair mesmo assim?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sair sem salvar',
    cancelButtonText: 'Continuar editando',
    confirmButtonColor: '#e04b3a',
    cancelButtonColor: '#757575',
    reverseButtons: true
  }).then((resultado) => resultado.isConfirmed);
};
