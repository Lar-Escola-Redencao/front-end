import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { UsuarioPerfil } from './usuario-perfil';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';

describe('UsuarioPerfil', () => {
  let component: UsuarioPerfil;
  let fixture: ComponentFixture<UsuarioPerfil>;
  let usuarioService: { buscarPorId: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    usuarioService = {
      buscarPorId: vi.fn(() => of({
        id: 7,
        nomeCompleto: 'Aluno Sales da Silva',
        dataNascimento: '2018-09-11',
        imagemPerfil: '/uploads/foto.jpg',
        nomeUnidade: 'SOS Bombeiros',
        nomeTurma: 'MANHA · 08:00-12:00'
      }))
    };

    await TestBed.configureTestingModule({
      imports: [UsuarioPerfil],
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: (chave: string) => chave === 'id' ? '7' : null }) } },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioPerfil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carrega o usuário da rota e exibe os dados principais no card lateral', () => {
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent;
    expect(usuarioService.buscarPorId).toHaveBeenCalledWith(7);
    expect(texto).toContain('Aluno Sales da Silva');
    expect(texto).toContain('08 anos');
    expect(texto).toContain('Desde não informado');
    expect(texto).toContain('SOS Bombeiros');
    expect(texto).toContain('Manhã');
  });

  it('troca a aba ativa mantendo os componentes separados por área', () => {
    fixture.detectChanges();
    component.selecionarAba('saude');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Saúde');
    expect(fixture.nativeElement.querySelector('app-usuario-perfil-saude')).toBeTruthy();
  });
});
