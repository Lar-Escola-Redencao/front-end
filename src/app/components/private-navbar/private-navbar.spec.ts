import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PrivateNavbar } from './private-navbar';
import { Auth } from 'src/app/shared/services/auth/auth';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';

describe('PrivateNavbar', () => {
  let component: PrivateNavbar;
  let fixture: ComponentFixture<PrivateNavbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivateNavbar],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
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
    component.menuVisivel = true;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links users option to dashboard users page', () => {
    const usersLink = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('a.card-opcao')
    ).find((link) => link.textContent?.includes('Usuários'));

    expect(usersLink?.getAttribute('href')).toBe('/dashboard/usuarios');
  });
});
