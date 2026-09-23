import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Role } from 'src/app/shared/models/permissao.model';
import { PrivateNavbar } from './private-navbar';

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildToken(payload: unknown): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  return `${header}.${base64url(JSON.stringify(payload))}.signature`;
}

describe('PrivateNavbar', () => {
  let component: PrivateNavbar;
  let fixture: ComponentFixture<PrivateNavbar>;

  async function criar(role: Role): Promise<void> {
    localStorage.setItem(
      'ler_auth_token',
      buildToken({ sub: 'u@b.com', role, exp: Math.floor(Date.now() / 1000) + 3600 }),
    );

    await TestBed.configureTestingModule({
      imports: [PrivateNavbar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivateNavbar);
    component = fixture.componentInstance;
    component.abrirMenu();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function linksDoMenu(): string[] {
    const links = fixture.nativeElement.querySelectorAll('.grid-opcoes a.card-opcao') as NodeListOf<HTMLAnchorElement>;
    return Array.from(links).map((a) => a.getAttribute('href') ?? '');
  }

  afterEach(() => localStorage.clear());

  it('should create', async () => {
    await criar('ADMINISTRADOR');
    expect(component).toBeTruthy();
  });

  it('exibe todos os módulos para o administrador', async () => {
    await criar('ADMINISTRADOR');
    expect(linksDoMenu()).toEqual([
      '/dashboard/diario',
      '/dashboard/usuarios',
      '/dashboard/colaboradores',
      '/dashboard/unidades-turmas',
      '/dashboard/conteudo-publico',
    ]);
  });

  it('exibe apenas gestão de usuário, de monitor e diário para o coordenador', async () => {
    await criar('COORDENADOR');
    expect(linksDoMenu()).toEqual(['/dashboard/diario', '/dashboard/usuarios', '/dashboard/colaboradores']);
  });

  it('exibe apenas o diário (presença e ocorrências) para o monitor', async () => {
    await criar('MONITOR');
    expect(linksDoMenu()).toEqual(['/dashboard/diario']);
  });
});
