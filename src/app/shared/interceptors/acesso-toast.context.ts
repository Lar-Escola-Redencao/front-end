import { HttpContextToken } from '@angular/common/http';

/** Permite que telas com uma mensagem de acesso mais específica assumam o feedback do 403. */
export const SILENCIAR_TOAST_ACESSO = new HttpContextToken<boolean>(() => false);
