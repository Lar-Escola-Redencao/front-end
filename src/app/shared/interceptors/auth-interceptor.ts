import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth } from '../services/auth/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const token = auth.getToken();

  const authorizedReq = isApiRequest && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      // Only treat this as a session expiry when the rejected request actually carried a
      // token — otherwise a plain wrong-password 401 on /auth/login would also trigger it.
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiRequest && token) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { reason: 'expired' } });
      }
      return throwError(() => error);
    }),
  );
};
