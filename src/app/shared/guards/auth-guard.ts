import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  const queryParams: Record<string, string> = { returnUrl: state.url };
  if (auth.consumeExpiredSessionFlag()) {
    queryParams['reason'] = 'expired';
  }

  return router.createUrlTree(['/login'], { queryParams });
};
