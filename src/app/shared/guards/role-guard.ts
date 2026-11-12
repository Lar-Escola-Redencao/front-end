import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { Modulo } from '../models/permissao.model';
import { Auth } from '../services/auth/auth';

export const MENSAGEM_PAGINA_NAO_PERMITIDA = 'Seu perfil não tem permissão para acessar esta página.';

/**
 * Bloqueia o acesso via URL a módulos que não pertencem ao perfil logado.
 * A rota informa o módulo em `data: { modulo: '...' }`; sem permissão, avisa e volta para o início do dashboard.
 * O início do dashboard não declara módulo, então o redirecionamento não entra em ciclo.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const modulo = route.data['modulo'] as Modulo | undefined;
  if (!modulo || auth.podeAcessar(modulo)) {
    return true;
  }

  toastr.warning(MENSAGEM_PAGINA_NAO_PERMITIDA, 'Acesso negado');
  return router.createUrlTree(['/dashboard']);
};
