import { Modulo, Role, parseRole, roleTemAcesso } from './permissao.model';

describe('parseRole', () => {
  it.each(['ADMINISTRADOR', 'COORDENADOR', 'MONITOR'])('aceita o perfil %s', (valor) => {
    expect(parseRole(valor)).toBe(valor);
  });

  it('normaliza o formato legado ROLE_X e caixa baixa', () => {
    expect(parseRole('ROLE_ADMINISTRADOR')).toBe('ADMINISTRADOR');
    expect(parseRole('monitor')).toBe('MONITOR');
  });

  it('rejeita valores desconhecidos ou ausentes', () => {
    expect(parseRole('VISITANTE')).toBeNull();
    expect(parseRole(undefined)).toBeNull();
    expect(parseRole(42)).toBeNull();
  });
});

describe('roleTemAcesso (matriz de permissões)', () => {
  const todos: Modulo[] = ['diario', 'usuarios', 'colaboradores', 'unidades-turmas', 'conteudo-publico'];

  function modulosDe(role: Role | null): Modulo[] {
    return todos.filter((modulo) => roleTemAcesso(role, modulo));
  }

  it('administrador tem acesso total', () => {
    expect(modulosDe('ADMINISTRADOR')).toEqual(todos);
  });

  it('coordenador acessa gestão de usuário, gestão de monitor e diário', () => {
    expect(modulosDe('COORDENADOR')).toEqual(['diario', 'usuarios', 'colaboradores']);
  });

  it('monitor acessa apenas o diário (presença e ocorrências)', () => {
    expect(modulosDe('MONITOR')).toEqual(['diario']);
  });

  it('sem perfil não acessa nenhum módulo', () => {
    expect(modulosDe(null)).toEqual([]);
  });
});
