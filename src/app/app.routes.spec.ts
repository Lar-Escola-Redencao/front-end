import { Route } from '@angular/router';

import { routes } from './app.routes';
import { authGuard } from './shared/guards/auth-guard';
import { guestGuard } from './shared/guards/guest-guard';
import { roleGuard } from './shared/guards/role-guard';

const PUBLICAS = ['', 'conheca-a-osc', 'eventos', 'eventos/:id', 'como-ajudar', 'entrar', 'recuperar-senha', 'transparencia', 'grafica'];

function rota(path: string): Route {
  const encontrada = routes.find(r => r.path === path);
  if (!encontrada) throw new Error(`Rota ${path} não encontrada`);
  return encontrada;
}

describe('mapa de rotas', () => {
  it('toda página pública redireciona colaboradores autenticados (guestGuard)', () => {
    for (const path of PUBLICAS) {
      expect(rota(path).canActivate, path).toContain(guestGuard);
    }
  });

  it('não existem rotas de primeiro nível sem guarda, exceto o curinga', () => {
    const semGuarda = routes.filter(r => r.path !== '**' && !r.canActivate?.length);
    expect(semGuarda.map(r => r.path)).toEqual([]);
  });

  it('a área interna exige sessão na rota e em cada página filha', () => {
    const dashboard = rota('dashboard');
    expect(dashboard.canActivate).toContain(authGuard);
    expect(dashboard.canActivateChild).toContain(authGuard);
  });

  it('páginas internas restritas declaram o módulo conferido pelo roleGuard', () => {
    const filhas = rota('dashboard').children ?? [];
    for (const filha of filhas.filter(f => f.path && f.path !== 'perfil')) {
      expect(filha.canActivate, filha.path).toContain(roleGuard);
      expect(filha.data?.['modulo'], filha.path).toBeTruthy();
    }
  });
});
