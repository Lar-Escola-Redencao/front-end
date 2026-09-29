/** Perfis emitidos pelo back-end na claim `role` do JWT. */
export type Role = 'ADMINISTRADOR' | 'COORDENADOR' | 'MONITOR';

export const ROLES: readonly Role[] = ['ADMINISTRADOR', 'COORDENADOR', 'MONITOR'];

/** Módulos da área logada cuja visibilidade/acesso depende do perfil. */
export type Modulo =
  | 'diario'
  | 'usuarios'
  | 'colaboradores'
  | 'unidades-turmas'
  | 'conteudo-publico';

/**
 * Matriz de permissões:
 * - Administrador: acesso total.
 * - Coordenador: gestão de usuário, gestão de monitor (colaboradores), registro de presença e ocorrências.
 * - Monitor: apenas registro de presença e ocorrências (diário de turma).
 */
export const PERMISSOES: Record<Modulo, readonly Role[]> = {
  diario: ['ADMINISTRADOR', 'COORDENADOR', 'MONITOR'],
  usuarios: ['ADMINISTRADOR', 'COORDENADOR'],
  colaboradores: ['ADMINISTRADOR', 'COORDENADOR'],
  'unidades-turmas': ['ADMINISTRADOR'],
  'conteudo-publico': ['ADMINISTRADOR'],
};

/** Converte o valor bruto da claim em um perfil conhecido (aceita o legado `ROLE_X`). */
export function parseRole(valor: unknown): Role | null {
  if (typeof valor !== 'string') {
    return null;
  }
  const normalizado = valor.trim().toUpperCase().replace(/^ROLE_/, '');
  return (ROLES as readonly string[]).includes(normalizado) ? (normalizado as Role) : null;
}

export function roleTemAcesso(role: Role | null, modulo: Modulo): boolean {
  return role !== null && PERMISSOES[modulo].includes(role);
}
