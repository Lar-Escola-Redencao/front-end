import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

import { Modulo } from '../models/permissao.model';
import { Auth } from '../services/auth/auth';
import { roleGuard } from './role-guard';

describe('roleGuard', () => {
  let authStub: { podeAcessar: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authStub = { podeAcessar: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Auth, useValue: authStub }],
    });
    router = TestBed.inject(Router);
  });

  function runGuard(modulo?: Modulo): boolean | UrlTree {
    const route = { data: modulo ? { modulo } : {} } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => roleGuard(route, {} as never)) as boolean | UrlTree;
  }

  it('permite a navegação quando o perfil tem acesso ao módulo', () => {
    authStub.podeAcessar.mockReturnValue(true);

    expect(runGuard('colaboradores')).toBe(true);
    expect(authStub.podeAcessar).toHaveBeenCalledWith('colaboradores');
  });

  it('redireciona para /dashboard quando o perfil não tem acesso', () => {
    authStub.podeAcessar.mockReturnValue(false);

    const result = runGuard('conteudo-publico') as UrlTree;

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result)).toBe('/dashboard');
  });

  it('permite rotas que não declaram módulo', () => {
    expect(runGuard()).toBe(true);
    expect(authStub.podeAcessar).not.toHaveBeenCalled();
  });
});
