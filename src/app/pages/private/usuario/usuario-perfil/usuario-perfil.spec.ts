import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { UsuarioPerfil } from './usuario-perfil';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { ContatoService } from 'src/app/shared/services/usuario/contato.service';
import { ToastrService } from 'ngx-toastr';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { Unidade } from 'src/app/shared/models/unidade.model';

describe('UsuarioPerfil', () => {
  let component: UsuarioPerfil;
  let fixture: ComponentFixture<UsuarioPerfil>;
  let usuarioService: { buscarPorId: ReturnType<typeof vi.fn> };
  let sessaoService: {
    carregar: ReturnType<typeof vi.fn>;
    isMonitor: ReturnType<typeof vi.fn>;
    isCoordenador: ReturnType<typeof vi.fn>;
    unidadesPermitidasIds: ReturnType<typeof vi.fn>;
    podeRemoverVinculo: ReturnType<typeof vi.fn>;
    podeExcluirUsuario: ReturnType<typeof vi.fn>;
  };

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
    sessaoService = {
      carregar: vi.fn(() => of(null)),
      isMonitor: vi.fn(() => false),
      isCoordenador: vi.fn(() => false),
      unidadesPermitidasIds: vi.fn(() => []),
      podeRemoverVinculo: vi.fn(() => true),
      podeExcluirUsuario: vi.fn(() => true)
    };

    await TestBed.configureTestingModule({
      imports: [UsuarioPerfil],
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: ContatoService, useValue: { buscarAutocomplete: vi.fn(() => of([])), atualizarContato: vi.fn() } },
        { provide: ToastrService, useValue: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } },
        { provide: SessaoService, useValue: sessaoService },
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
    expect(usuarioService.buscarPorId).toHaveBeenCalledWith(7, true);
    expect(texto).toContain('Aluno Sales da Silva');
    expect(texto).toContain('08 anos (11 set. 2018)');
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

  it('exibe a tabela de contatos vinculados na aba contatos', () => {
    component.selecionarAba('contatos');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-usuario-perfil-contatos')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Novo contato');
  });

  it('restringe as unidades exibidas na rematrícula ao escopo do coordenador', () => {
    sessaoService.isCoordenador.mockReturnValue(true);
    sessaoService.unidadesPermitidasIds.mockReturnValue([2]);
    component.modoSelecaoTurma = 'rematricula';
    component.unidadesTransferencia = [
      { id: 1, nome: 'Unidade A' } as Unidade,
      { id: 2, nome: 'Unidade B' } as Unidade
    ];

    expect(component.unidadesDisponiveisTransferencia).toEqual([
      { id: 2, nome: 'Unidade B' }
    ]);
  });
});
