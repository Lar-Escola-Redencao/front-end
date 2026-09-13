export interface LoginRequest {
  identifier: string;
  password: string;
}

/**
 * Wire shape expected by POST /api/auth/login. The backend accepts either an e-mail or a CPF in
 * `identificador` and resolves whichever one it is server-side.
 */
export interface LoginRequestDto {
  identificador: string;
  senha: string;
  lembrarMe: boolean;
}

export interface LoginResponse {
  token: string;
}
