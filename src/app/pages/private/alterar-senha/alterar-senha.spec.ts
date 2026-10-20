import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AlterarSenha } from './alterar-senha';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';
import { Auth } from 'src/app/shared/services/auth/auth';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

describe('Alteração de senha em duas etapas', () => {
  let component: AlterarSenha;
  let fixture: ComponentFixture<AlterarSenha>;
  let service: {
    validarSenhaAtual: ReturnType<typeof vi.fn>;
    alterarSenha: ReturnType<typeof vi.fn>;
  };
  let auth: { logout: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = {
      validarSenhaAtual: vi.fn(() => of(undefined)),
      alterarSenha: vi.fn(() => of(undefined))
    };
    auth = { logout: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({ providers: [
      { provide: PerfilService, useValue: service },
      { provide: Auth, useValue: auth },
      { provide: Router, useValue: router }
    ] });
    fixture = TestBed.createComponent(AlterarSenha);
    component = fixture.componentInstance;
  });

  function confirmarAtual(): void {
    component.formAtual.setValue({ senhaAtual: 'admin123' });
    component.confirmarSenhaAtual();
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserva a senha e o modal ao desistir do fechamento', async () => {
    component.formAtual.controls.senhaAtual.setValue('admin123');
    const alerta = vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false } as any);
    const fechar = vi.spyOn(component.closed, 'emit');
    await component.fechar();
    expect(fechar).not.toHaveBeenCalled();
    expect(component.formAtual.getRawValue().senhaAtual).toBe('admin123');
    expect(component.confirmandoDesistencia()).toBe(false);
  });

  it('descarta as senhas e fecha somente após confirmar', async () => {
    confirmarAtual();
    component.formSenha.controls.novaSenha.setValue('Nova123');
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as any);
    const fechar = vi.spyOn(component.closed, 'emit');
    await component.fechar();
    expect(fechar).toHaveBeenCalledOnce();
    expect(component.formAtual.getRawValue().senhaAtual).toBe('');
    expect(component.formSenha.getRawValue().novaSenha).toBe('');
  });

  it('protege a volta para a primeira etapa e mantém os dados ao cancelar', async () => {
    confirmarAtual();
    component.formSenha.controls.novaSenha.setValue('Nova123');
    const alerta = vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false } as any);
    await component.voltarParaConfirmacao();
    expect(component.etapa()).toBe(2);
    expect(component.formSenha.getRawValue().novaSenha).toBe('Nova123');
    alerta.mockResolvedValue({ isConfirmed: true } as any);
    await component.voltarParaConfirmacao();
    expect(component.etapa()).toBe(1);
    expect(component.formSenha.getRawValue().novaSenha).toBe('');
  });

  it('não pede confirmação sem preenchimento ou após sucesso', async () => {
    const alerta = vi.spyOn(Swal, 'fire');
    await component.fechar();
    expect(alerta).not.toHaveBeenCalled();
    component.etapa.set(3);
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(false);
    await component.fechar();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('reutiliza a confirmação pendente e impede fechamento durante requisição', async () => {
    component.formAtual.controls.senhaAtual.setValue('admin123');
    let responder!: (resultado: any) => void;
    const alerta = vi.spyOn(Swal, 'fire').mockReturnValue(new Promise(resolve => responder = resolve));
    const primeira = component.confirmarDesistencia();
    expect(component.confirmarDesistencia()).toBe(primeira);
    expect(alerta).toHaveBeenCalledOnce();
    responder({ isConfirmed: false });
    await primeira;
    component.carregando.set(true);
    expect(await component.confirmarDesistencia()).toBe(false);
    expect(alerta).toHaveBeenCalledOnce();
  });

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

  it('permite enviar os dois passos vazios para exibir os campos obrigatórios', () => {
    fixture.detectChanges();
    const enviar = () => fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(enviar().disabled).toBe(false);
    enviar().click();
    fixture.detectChanges();
    expect(component.formAtual.controls.senhaAtual.touched).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-error')).toBeTruthy();
    expect(service.validarSenhaAtual).not.toHaveBeenCalled();
    confirmarAtual();
    fixture.detectChanges();
    expect(enviar().disabled).toBe(false);
    enviar().click();
    fixture.detectChanges();
    expect(component.formSenha.controls.novaSenha.touched).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-error')).toBeTruthy();
    expect(service.alterarSenha).not.toHaveBeenCalled();
  });

  it('desloga e navega para a recuperação de senha somente após confirmar o descarte', async () => {
    component.formAtual.controls.senhaAtual.setValue('senha-incorreta');
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false } as any);
    await component.irParaRecuperacaoSenha();

    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as any);
    await component.irParaRecuperacaoSenha();

    expect(auth.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/recuperar-senha']);
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

  it('coloca a divergência no campo de confirmação somente quando ele tem valor', () => {
    component.formSenha.controls.novaSenha.setValue('Nova123');
    expect(component.formSenha.controls.confirmacaoSenha.hasError('senhasDiferentes')).toBe(false);

    component.formSenha.controls.confirmacaoSenha.setValue('Outra123');
    expect(component.formSenha.controls.confirmacaoSenha.hasError('senhasDiferentes')).toBe(true);
    expect(component.formSenha.hasError('senhasDiferentes')).toBe(true);
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
