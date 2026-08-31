import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { Auth } from '../services/auth/auth';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  let authStub: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    consumeExpiredSessionFlag: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    authStub = {
      isAuthenticated: vi.fn(),
      consumeExpiredSessionFlag: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Auth, useValue: authStub }],
    });
    router = TestBed.inject(Router);
  });

  function runGuard(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url } as never),
    ) as boolean | UrlTree;
  }

  it('allows navigation when authenticated', () => {
    authStub.isAuthenticated.mockReturnValue(true);

    const result = runGuard('/backoffice');

    expect(result).toBe(true);
    expect(authStub.consumeExpiredSessionFlag).not.toHaveBeenCalled();
  });

  it('redirects to /login without a reason when there was no prior session', () => {
    authStub.isAuthenticated.mockReturnValue(false);
    authStub.consumeExpiredSessionFlag.mockReturnValue(false);

    const result = runGuard('/backoffice') as UrlTree;

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fbackoffice');
  });

  it('redirects to /login with reason=expired when a stored token was dropped as expired', () => {
    authStub.isAuthenticated.mockReturnValue(false);
    authStub.consumeExpiredSessionFlag.mockReturnValue(true);

    const result = runGuard('/backoffice') as UrlTree;

    expect(result instanceof UrlTree).toBe(true);
    const serialized = router.serializeUrl(result);
    expect(serialized).toContain('reason=expired');
    expect(serialized).toContain('returnUrl=%2Fbackoffice');
  });
});
