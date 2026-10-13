import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UsuarioPerfilContatos } from './contatos';
import { ContatoService } from 'src/app/shared/services/usuario/contato.service';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { ToastrService } from 'ngx-toastr';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { Alertas } from 'src/app/shared/utils/alerts';

describe('UsuarioPerfilContatos', () => {
  let component: UsuarioPerfilContatos;
  let fixture: ComponentFixture<UsuarioPerfilContatos>;
  let contatoService: any;
  let usuarioService: any;
  let toastr: any;

  beforeEach(async () => {
    vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
    contatoService = { buscarAutocomplete: vi.fn(() => of([])), atualizarContato: vi.fn(() => of(void 0)) };
    usuarioService = {
      buscarPorId: vi.fn(() => of({ id: 1, nomeCompleto: 'Aluno', contatos: [] })),
      vincularNovoContato: vi.fn(),
      vincularContatoExistente: vi.fn(),
      atualizarVinculo: vi.fn(() => of(void 0)),
      desvincularContato: vi.fn()
    };
    toastr = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [UsuarioPerfilContatos, NoopAnimationsModule],
      providers: [
        { provide: ContatoService, useValue: contatoService },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: SessaoService, useValue: { podeRemoverVinculo: vi.fn(() => true) } },
        { provide: ToastrService, useValue: toastr }
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

  it('confirma descarte antes de fechar edição de contato alterada', async () => {
    component.usuario = { id: 1, nomeCompleto: 'Aluno', contatos: [] } as any;
    component.abrirFormulario('editar', {
      id: 1,
      nomeCompleto: 'Contato',
      telefone: '16999999999',
      parentesco: 'MAE',
      principal: true
    } as any);
    component.form.get('nomeCompleto')?.setValue('Contato alterado');

    await component.fecharModal();

    expect(Alertas.confirmarDescarte).toHaveBeenCalledTimes(1);
    expect(component.modalAberto).toBe(true);
    expect(component.form.get('nomeCompleto')?.value).toBe('Contato alterado');

    vi.mocked(Alertas.confirmarDescarte).mockResolvedValue(true);
    await component.fecharModal();

    expect(component.modalAberto).toBe(false);
  });

  it('avisa no reload quando formulário de contato tem alterações', () => {
    component.usuario = { id: 1, nomeCompleto: 'Aluno', contatos: [] } as any;
    component.abrirFormulario('editar', {
      id: 1,
      nomeCompleto: 'Contato',
      telefone: '16999999999',
      parentesco: 'MAE',
      principal: true
    } as any);
    component.form.get('telefone')?.setValue('(16) 98888-8888');
    const event = { preventDefault: vi.fn(), returnValue: undefined as string | undefined } as unknown as BeforeUnloadEvent;

    component.avisarAntesDeFechar(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');
  });

  it('libera o botão de salvar quando a atualização do vínculo falha', async () => {
    usuarioService.atualizarVinculo.mockReturnValue(throwError(() => ({
      error: { message: 'Não é possível remover o status de principal diretamente.' }
    })));
    component.usuario = { id: 1, nomeCompleto: 'Aluno', contatos: [] } as any;
    component.abrirFormulario('editar', {
      id: 1,
      nomeCompleto: 'Contato',
      telefone: '16999999999',
      parentesco: 'MAE',
      principal: true
    } as any);
    component.form.get('principal')?.setValue(false);

    await component.salvar();

    expect(component.salvando).toBe(false);
    expect(toastr.error).toHaveBeenCalledWith('Não é possível remover o status de principal diretamente.', 'Erro');
    expect(component.modalAberto).toBe(true);
  });
});
