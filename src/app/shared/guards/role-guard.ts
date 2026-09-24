import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Modulo } from '../models/permissao.model';
import { Auth } from '../services/auth/auth';

/**
 * Bloqueia o acesso via URL a módulos que não pertencem ao perfil logado.
 * A rota informa o módulo em `data: { modulo: '...' }`; sem permissão, volta para o início do dashboard.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const modulo = route.data['modulo'] as Modulo | undefined;
  if (!modulo || auth.podeAcessar(modulo)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
