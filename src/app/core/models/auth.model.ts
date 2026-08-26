export interface LoginRequest {
  email: string;
  password: string;
}

/** Wire shape expected by POST /api/auth/login (backend field is `senha`, not `password`). */
export interface LoginRequestDto {
  email: string;
  senha: string;
  lembrarMe: boolean;
}

export interface LoginResponse {
  token: string;
}
