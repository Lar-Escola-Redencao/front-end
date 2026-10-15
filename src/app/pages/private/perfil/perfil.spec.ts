import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { Perfil } from './perfil';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';
import { canDeactivateGuard } from 'src/app/shared/guards/can-deactivate.guard';
import { Alertas } from 'src/app/shared/utils/alerts';
import { AlterarSenha } from '../alterar-senha/alterar-senha';
import { By } from '@angular/platform-browser';
import { Auth } from 'src/app/shared/services/auth/auth';
import { Router } from '@angular/router';

describe('Proteção de alterações não salvas em Meu perfil', () => {
  let component: Perfil;
  let alterarSenha: AlterarSenha;
  let service: { buscarMeuPerfil: ReturnType<typeof vi.fn>; atualizar: ReturnType<typeof vi.fn> };
  const perfil = {
    id: 1,
    nomeCompleto: 'Administrador Master',
    email: 'admin@larredencao.org.br',
    cpf: '52998224725',
    endereco: 'Sede - São José',
    telefone: '16999999999',
    idPapel: 1,
    nomePapel: 'ADMINISTRADOR',
    unidades: []
  };

  beforeEach(() => {
    service = {
      buscarMeuPerfil: vi.fn(() => of(perfil)),
      atualizar: vi.fn(() => of(perfil))
    };
    const auth = { logout: vi.fn() };
    const router = { navigate: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({ providers: [
      { provide: PerfilService, useValue: service },
      { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: Auth, useValue: auth },
      { provide: Router, useValue: router }
    ] });
    TestBed.overrideComponent(Perfil, { set: { template: '<app-alterar-senha></app-alterar-senha>' } });
    TestBed.overrideComponent(AlterarSenha, { set: { template: '' } });
    const fixture = TestBed.createComponent(Perfil);
    component = fixture.componentInstance;
    fixture.detectChanges();
    alterarSenha = fixture.debugElement.query(By.directive(AlterarSenha)).componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function alterarNome(): void {
    component.habilitarEdicao();
    component.formDados.get('nomeCompleto')!.setValue('Nome alterado');
  }

  it('protege navegação e recarregamento quando somente o modal de senha tem dados', async () => {
    alterarSenha.formAtual.controls.senhaAtual.setValue('admin123');
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(true);
    const confirmar = vi.spyOn(alterarSenha, 'confirmarDesistencia').mockResolvedValue(false);
    expect(await canDeactivateGuard(component, null!, null!, null!)).toBe(false);
    expect(confirmar).toHaveBeenCalledOnce();
    const evento = { preventDefault: vi.fn(), returnValue: undefined };
    component.avisarAntesDeFechar(evento as unknown as BeforeUnloadEvent);
    expect(evento.preventDefault).toHaveBeenCalledOnce();
    expect(evento.returnValue).toBe('');
  });

  it('não avisa só por abrir a edição nem após restaurar o valor original', () => {
    component.habilitarEdicao();
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(false);
    component.formDados.get('nomeCompleto')!.setValue('Outro nome');
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(true);
    component.formDados.get('nomeCompleto')!.setValue(perfil.nomeCompleto);
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(false);
  });

  it('avisa no recarregamento com alteração e libera após cancelar', () => {
    alterarNome();
    const evento = { preventDefault: vi.fn(), returnValue: undefined };
    component.avisarAntesDeFechar(evento as unknown as BeforeUnloadEvent);
    expect(evento.preventDefault).toHaveBeenCalledOnce();
    expect(evento.returnValue).toBe('');
    component.cancelarEdicao();
    evento.preventDefault.mockClear();
    component.avisarAntesDeFechar(evento as unknown as BeforeUnloadEvent);
    expect(evento.preventDefault).not.toHaveBeenCalled();
    expect(component.formDados.getRawValue().nomeCompleto).toBe(perfil.nomeCompleto);
  });

  it('usa o alerta existente para impedir ou autorizar a navegação', async () => {
    alterarNome();
    const confirmar = vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
    expect(await canDeactivateGuard(component, null!, null!, null!)).toBe(false);
    confirmar.mockResolvedValue(true);
    expect(await canDeactivateGuard(component, null!, null!, null!)).toBe(true);
    component.cancelarEdicao();
    confirmar.mockClear();
    expect(await canDeactivateGuard(component, null!, null!, null!)).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('limpa a pendência após salvar com sucesso', () => {
    alterarNome();
    service.atualizar.mockReturnValue(of({ ...perfil, nomeCompleto: 'Nome alterado' }));
    component.salvar();
    expect(service.atualizar).toHaveBeenCalledOnce();
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(false);
    component.habilitarEdicao();
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(false);
  });

  it('mantém a proteção quando o salvamento falha', () => {
    alterarNome();
    service.atualizar.mockReturnValue(throwError(() => ({ status: 500 })));
    component.salvar();
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(true);
    expect(component.formDados.getRawValue().nomeCompleto).toBe('Nome alterado');
  });
});
