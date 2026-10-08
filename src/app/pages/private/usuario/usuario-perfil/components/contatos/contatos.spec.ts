import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { UsuarioPerfilContatos } from './contatos';
import { ContatoService } from 'src/app/shared/services/usuario/contato.service';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { ToastrService } from 'ngx-toastr';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';

describe('UsuarioPerfilContatos', () => {
  let component: UsuarioPerfilContatos;
  let fixture: ComponentFixture<UsuarioPerfilContatos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioPerfilContatos, NoopAnimationsModule],
      providers: [
        { provide: ContatoService, useValue: { buscarAutocomplete: vi.fn(() => of([])), atualizarContato: vi.fn() } },
        { provide: UsuarioService, useValue: { buscarPorId: vi.fn(), vincularNovoContato: vi.fn(), vincularContatoExistente: vi.fn(), atualizarVinculo: vi.fn(), desvincularContato: vi.fn() } },
        { provide: SessaoService, useValue: { podeRemoverVinculo: vi.fn(() => true) } },
        { provide: ToastrService, useValue: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioPerfilContatos);
    component = fixture.componentInstance;
  });

  it('lista o contato principal antes dos demais', () => {
    component.usuario = {
      id: 1,
      nomeCompleto: 'Aluno',
      contatos: [
        { id: 2, nomeCompleto: 'Contato adicional', telefone: '16999999999', parentesco: 'PAI', principal: false },
        { id: 1, nomeCompleto: 'Contato principal', telefone: '16988888888', parentesco: 'MAE', principal: true }
      ]
    } as any;

    expect(component.contatosOrdenados.map(contato => contato.id)).toEqual([1, 2]);
  });

  it('oculta o botão de novo contato quando o usuário já possui quatro contatos', () => {
    component.usuario = {
      id: 1,
      nomeCompleto: 'Aluno',
      contatos: [
        { id: 1, nomeCompleto: 'A', telefone: '1', principal: true },
        { id: 2, nomeCompleto: 'B', telefone: '2', principal: false },
        { id: 3, nomeCompleto: 'C', telefone: '3', principal: false },
        { id: 4, nomeCompleto: 'D', telefone: '4', principal: false }
      ]
    } as any;

    expect(component.podeAdicionarContato).toBe(false);
  });
});
