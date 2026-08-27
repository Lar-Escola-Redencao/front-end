import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth/auth';

/** Keeps an already-authenticated visitor (e.g. a remembered session) off the login form. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/backoffice']);
  }

  return true;
};
