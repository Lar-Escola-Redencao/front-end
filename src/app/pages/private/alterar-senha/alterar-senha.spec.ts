import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AlterarSenha } from './alterar-senha';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';

describe('Alteração de senha em duas etapas', () => {
  let component: AlterarSenha;
  let service: {
    validarSenhaAtual: ReturnType<typeof vi.fn>;
    alterarSenha: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      validarSenhaAtual: vi.fn(() => of(undefined)),
      alterarSenha: vi.fn(() => of(undefined))
    };
    TestBed.configureTestingModule({ providers: [{ provide: PerfilService, useValue: service }] });
    TestBed.overrideComponent(AlterarSenha, { set: { template: '' } });
    component = TestBed.createComponent(AlterarSenha).componentInstance;
  });

  function confirmarAtual(): void {
    component.formAtual.setValue({ senhaAtual: 'admin123' });
    component.confirmarSenhaAtual();
  }

  it('só libera a nova senha após confirmação do servidor', () => {
    const resposta = new Subject<void>();
    service.validarSenhaAtual.mockReturnValue(resposta);
    confirmarAtual();
    expect(service.validarSenhaAtual).toHaveBeenCalledWith('admin123');
    expect(component.etapa()).toBe(1);
    resposta.next();
    expect(component.etapa()).toBe(2);
  });

  it('não libera a troca quando a senha atual é rejeitada', () => {
    service.validarSenhaAtual.mockReturnValue(
      throwError(() => ({ error: { message: 'A senha atual está incorreta.' } }))
    );
    confirmarAtual();
    expect(component.etapa()).toBe(1);
    expect(component.formAtual.controls.senhaAtual.hasError('senhaIncorreta')).toBe(true);
    expect(component.formAtual.enabled).toBe(true);
  });

  it('bloqueia troca antes da confirmação, senhas diferentes e senha fora da política', () => {
    component.formSenha.setValue({ novaSenha: 'Nova123', confirmacaoSenha: 'Nova123' });
    component.salvarSenha();
    confirmarAtual();
    component.formSenha.setValue({ novaSenha: 'Nova123', confirmacaoSenha: 'Outra123' });
    component.salvarSenha();
    component.formSenha.setValue({ novaSenha: 'abc', confirmacaoSenha: 'abc' });
    component.salvarSenha();
    expect(service.alterarSenha).not.toHaveBeenCalled();
  });

  it('reenvia a senha atual validada e limpa todas as senhas no sucesso', () => {
    confirmarAtual();
    component.formSenha.setValue({ novaSenha: 'Nova123', confirmacaoSenha: 'Nova123' });
    component.salvarSenha();
    expect(service.alterarSenha).toHaveBeenCalledWith({
      senhaAtual: 'admin123',
      novaSenha: 'Nova123',
      confirmacaoSenha: 'Nova123'
    });
    expect(component.etapa()).toBe(3);
    expect(component.formAtual.getRawValue().senhaAtual).toBe('');
    expect(component.formSenha.getRawValue().novaSenha).toBe('');
  });

  it('retorna à confirmação se o salvamento for rejeitado', () => {
    service.alterarSenha.mockReturnValue(
      throwError(() => ({ error: { message: 'A senha atual está incorreta.' } }))
    );
    confirmarAtual();
    component.formSenha.setValue({ novaSenha: 'Nova123', confirmacaoSenha: 'Nova123' });
    component.salvarSenha();
    expect(component.etapa()).toBe(1);
    expect(component.erro()).toContain('senha atual');
    expect(component.carregando()).toBe(false);
    expect(component.formAtual.getRawValue().senhaAtual).toBe('');
  });
});
