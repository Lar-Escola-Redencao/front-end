import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Auth } from '../services/auth/auth';
import { decodeJwtPayload } from '../utils/jwt.util';
import { SILENCIAR_TOAST_ACESSO } from './acesso-toast.context';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const toastr = inject(ToastrService);

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
      if (error instanceof HttpErrorResponse && error.status === 403 && isApiRequest && !req.context.get(SILENCIAR_TOAST_ACESSO)) {
        const mensagem = typeof error.error === 'object' && error.error?.message
          ? error.error.message
          : 'Usuário autenticado não possui permissão para acessar este recurso.';
        toastr.error(mensagem, 'Acesso negado');
      }
      return throwError(() => error);
    }),
  );
};
