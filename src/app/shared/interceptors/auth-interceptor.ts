import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth } from '../services/auth/auth';
import { decodeJwtPayload } from '../utils/jwt.util';

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

      if (error instanceof HttpErrorResponse && error.status === 401 && isApiRequest && token) {
        auth.logout();

        const payload = decodeJwtPayload(token);
        const isExpired = payload?.exp ? Date.now() >= payload.exp * 1000 : false;
        
        const reason = isExpired ? 'expired' : 'invalid';

        router.navigate(['/entrar'], { queryParams: { reason } });
      }
      return throwError(() => error);
    }),
  );
};