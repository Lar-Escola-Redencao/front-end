export interface LoginRequest {
  email: string;
  password: string;
}

/** Wire shape expected by POST /auth/login (backend field is `senha`, not `password`). */
export interface LoginRequestDto {
  email: string;
  senha: string;
  lembrarMe: boolean;
}

export interface LoginResponse {
  token: string;
}
