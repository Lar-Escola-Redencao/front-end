import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { Perfil } from './perfil';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';
import { canDeactivateGuard } from 'src/app/shared/guards/can-deactivate.guard';
import { Alertas } from 'src/app/shared/utils/alerts';
import { AlterarSenha } from '../alterar-senha/alterar-senha';
import { By } from '@angular/platform-browser';
import { Auth } from 'src/app/shared/services/auth/auth';
import { provideRouter, Router } from '@angular/router';

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

  it('não envia o perfil sem alterações, inclusive depois de desfazer uma edição', () => {
    component.habilitarEdicao();
    component.salvar();
    expect(service.atualizar).not.toHaveBeenCalled();
    component.formDados.get('nomeCompleto')!.setValue('Outro nome');
    component.formDados.get('nomeCompleto')!.setValue(perfil.nomeCompleto);
    component.salvar();
    expect(service.atualizar).not.toHaveBeenCalled();
  });

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

  it('libera CPF e e-mail somente para administrador, sem papel ou unidades no formulário', () => {
    component.habilitarEdicaoConta();
    expect(component.formConta.enabled).toBe(true);
    expect(Object.keys(component.formConta.controls)).toEqual(['email', 'cpf']);
    component.cancelarEdicaoConta();
    component.perfil = { ...perfil, nomePapel: 'COORDENADOR' };
    component.habilitarEdicaoConta();
    expect(component.formConta.disabled).toBe(true);
    expect(component.modoEdicaoConta).toBe(false);
  });

  it('não confirma nem desloga quando CPF e e-mail permanecem iguais', async () => {
    const alerta = vi.spyOn(Alertas, 'confirmarAlteracaoIdentificadores').mockResolvedValue(true);
    component.habilitarEdicaoConta();
    component.formConta.get('cpf')!.setValue('529.982.247-25');
    component.formConta.get('email')!.setValue('ADMIN@LARREDENCAO.ORG.BR');
    await component.salvarConta();
    expect(alerta).not.toHaveBeenCalled();
    expect(service.atualizar).not.toHaveBeenCalled();
    expect(TestBed.inject(Auth).logout).not.toHaveBeenCalled();
  });

  it('preserva a edição quando cancela o aviso de logout', async () => {
    const alerta = vi.spyOn(Alertas, 'confirmarAlteracaoIdentificadores').mockResolvedValue(false);
    component.habilitarEdicaoConta();
    component.formConta.get('email')!.setValue('novo@exemplo.com');
    await component.salvarConta();
    expect(alerta).toHaveBeenCalledOnce();
    expect(service.atualizar).not.toHaveBeenCalled();
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(true);
    expect(TestBed.inject(Auth).logout).not.toHaveBeenCalled();
  });

  for (const campo of ['email', 'cpf']) {
    it(`salva ${campo} e encerra a sessão somente após sucesso`, async () => {
      vi.spyOn(Alertas, 'confirmarAlteracaoIdentificadores').mockResolvedValue(true);
      component.habilitarEdicaoConta();
      const novo = campo === 'email' ? 'novo@exemplo.com' : '111.444.777-35';
      component.formConta.get(campo)!.setValue(novo);
      service.atualizar.mockReturnValue(of({ ...perfil, [campo]: novo }));
      await component.salvarConta();
      expect(service.atualizar).toHaveBeenCalledWith(expect.objectContaining({
        email: campo === 'email' ? novo : perfil.email,
        cpf: campo === 'cpf' ? '11144477735' : perfil.cpf
      }));
      expect(TestBed.inject(Auth).logout).toHaveBeenCalledOnce();
      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/entrar']);
      expect(component.formularioTemAlteracoesNaoSalvas()).toBe(false);
    });
  }

  it('mantém a sessão e os dados digitados se o salvamento da conta falhar', async () => {
    vi.spyOn(Alertas, 'confirmarAlteracaoIdentificadores').mockResolvedValue(true);
    component.habilitarEdicaoConta();
    component.formConta.get('email')!.setValue('novo@exemplo.com');
    service.atualizar.mockReturnValue(throwError(() => ({ status: 409, error: { message: 'E-mail em uso.' } })));
    await component.salvarConta();
    expect(TestBed.inject(Auth).logout).not.toHaveBeenCalled();
    expect(component.formConta.getRawValue().email).toBe('novo@exemplo.com');
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(true);
    expect(component.salvandoConta).toBe(false);
  });

  it('dados pessoais não alteram identificadores nem deslogam', () => {
    alterarNome();
    component.salvar();
    expect(service.atualizar).toHaveBeenCalledWith({
      nomeCompleto: 'Nome alterado', endereco: perfil.endereco, telefone: perfil.telefone
    });
    expect(TestBed.inject(Auth).logout).not.toHaveBeenCalled();
  });

  it('aguarda confirmação do servidor antes de encerrar a sessão', async () => {
    vi.spyOn(Alertas, 'confirmarAlteracaoIdentificadores').mockResolvedValue(true);
    const resposta = new Subject<typeof perfil>();
    service.atualizar.mockReturnValue(resposta);
    component.habilitarEdicaoConta();
    component.formConta.get('email')!.setValue('novo@exemplo.com');
    await component.salvarConta();
    expect(component.salvandoConta).toBe(true);
    expect(component.formConta.disabled).toBe(true);
    expect(TestBed.inject(Auth).logout).not.toHaveBeenCalled();
    resposta.next({ ...perfil, email: 'novo@exemplo.com' });
    resposta.complete();
    expect(TestBed.inject(Auth).logout).toHaveBeenCalledOnce();
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(false);
  });
});

describe('Formulários de Meu perfil', () => {
  afterEach(() => vi.restoreAllMocks());

  it('impede abrir alteração de senha enquanto salva os identificadores da conta', async () => {
    const perfil = { id: 1, nomeCompleto: 'Administrador', email: 'admin@exemplo.com', cpf: '52998224725',
      endereco: 'Rua A', telefone: '11999999999', idPapel: 1, nomePapel: 'ADMINISTRADOR', unidades: [] };
    const resposta = new Subject<typeof perfil>();
    vi.spyOn(Alertas, 'confirmarAlteracaoIdentificadores').mockResolvedValue(true);
    TestBed.configureTestingModule({ imports: [Perfil], providers: [
      provideRouter([]),
      { provide: PerfilService, useValue: { buscarMeuPerfil: () => of(perfil), atualizar: () => resposta } },
      { provide: Auth, useValue: { logout: vi.fn() } },
      { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }
    ] });
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.habilitarEdicaoConta();
    componente.formConta.get('email')!.setValue('novo@exemplo.com');
    await componente.salvarConta();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const senha = fixture.nativeElement.querySelector('.link-alterar-senha') as HTMLButtonElement;
    expect(senha.disabled).toBe(true);
    senha.click();
    expect(componente.modalSenhaAberto).toBe(false);
    expect(fixture.nativeElement.querySelector('[formcontrolname="idPapel"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formcontrolname="idsUnidades"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Esses dados só podem ser alterados');
    resposta.error({ status: 409 });
    fixture.detectChanges();
    expect(senha.disabled).toBe(false);
  });
});
