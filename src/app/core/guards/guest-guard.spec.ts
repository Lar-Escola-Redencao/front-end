import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { Auth } from '../services/auth';
import { guestGuard } from './guest-guard';

describe('guestGuard', () => {
  let authStub: { isAuthenticated: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authStub = { isAuthenticated: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Auth, useValue: authStub }],
    });
    router = TestBed.inject(Router);
  });

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never)) as
      | boolean
      | UrlTree;
  }

  it('allows a visitor with no session to see the login page', () => {
    authStub.isAuthenticated.mockReturnValue(false);

    expect(runGuard()).toBe(true);
  });

  it('redirects an already-authenticated visitor (e.g. a remembered session) to /backoffice', () => {
    authStub.isAuthenticated.mockReturnValue(true);

    const result = runGuard() as UrlTree;

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result)).toBe('/backoffice');
  });
});
