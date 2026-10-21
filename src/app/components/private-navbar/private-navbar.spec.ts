import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import Swal from 'sweetalert2';

import { Modulo, Role, roleTemAcesso } from 'src/app/shared/models/permissao.model';
import { PrivateNavbar } from './private-navbar';
import { Auth } from 'src/app/shared/services/auth/auth';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';

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
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Auth,
          useValue: {
            podeAcessar: (modulo: Modulo) => roleTemAcesso(role, modulo),
            logout: () => {}
          }
        },
        {
          provide: PerfilService,
          useValue: {
            perfilAtual: () => ({ nomeCompleto: 'Maria Silva' }),
            buscarMeuPerfil: () => of({})
          }
        }
      ]
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

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('abre o mesmo modal de senha pelo atalho abaixo de Meu perfil', async () => {
    await criar('ADMINISTRADOR');
    fixture.nativeElement.querySelector('.btn-avatar').click();
    fixture.detectChanges();
    const botoes = fixture.nativeElement.querySelectorAll('.menu-usuario-item') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(botoes).map(botao => botao.textContent?.trim())).toEqual([
      expect.stringContaining('Meu perfil'),
      expect.stringContaining('Alterar senha'),
      expect.stringContaining('Sair')
    ]);
    botoes[1].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-alterar-senha')).toBeTruthy();
    expect(component.menuUsuarioAberto).toBe(false);
    expect(component.menuVisivel).toBe(false);
  });

  it('mantém a sessão quando a saída é cancelada', async () => {
    await criar('ADMINISTRADOR');
    const logout = vi.spyOn(TestBed.inject(Auth), 'logout');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false, isDenied: false, isDismissed: true });
    await component.sair();
    expect(logout).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('encerra a sessão somente após confirmar a saída', async () => {
    await criar('ADMINISTRADOR');
    const logout = vi.spyOn(TestBed.inject(Auth), 'logout');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const alerta = vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false });
    await component.sair();
    expect(alerta).toHaveBeenCalledWith(expect.objectContaining({
      confirmButtonText: 'Sim, sair', cancelButtonText: 'Cancelar', reverseButtons: false
    }));
    expect(logout).toHaveBeenCalledOnce();
    expect(navegar).toHaveBeenCalledWith('/');
  });

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
      '/dashboard/historico-alteracoes',
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
