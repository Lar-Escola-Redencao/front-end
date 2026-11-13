import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideToastr, ToastrService } from 'ngx-toastr';
import { ColaboradorComponent } from './colaborador.component';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { Auth } from 'src/app/shared/services/auth/auth';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { UnidadeService } from 'src/app/shared/services/colaborador/unidade.service';
import { ColaboradorService } from 'src/app/shared/services/colaborador/colaborador.service';
import { Colaborador } from 'src/app/shared/models/colaborador.model';
import { Alertas } from 'src/app/shared/utils/alerts';

describe('ColaboradorComponent', () => {
  let component: ColaboradorComponent;
  let fixture: ComponentFixture<ColaboradorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColaboradorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideToastr()]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaboradorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true).forEach(request => {
      if (request.request.url.endsWith('/papel/todos')) {
        request.flush([{ id: 1, nome: 'ADMINISTRADOR' }, { id: 2, nome: 'COORDENADOR' }, { id: 3, nome: 'MONITOR' }]);
      } else {
        request.flush({ content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 10 } });
      }
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mostra o motivo da API quando registros vinculados impedem excluir o colaborador', async () => {
    configurarPerfil('ADMINISTRADOR');
    vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(true);
    const mensagem = 'Não é possível excluir este colaborador porque existem registros vinculados a ele.';
    vi.spyOn(TestBed.inject(ColaboradorService), 'deletar').mockReturnValue(throwError(() => ({ status: 409, error: { message: mensagem } })));
    const toast = TestBed.inject(ToastrService);
    const aviso = vi.spyOn(toast, 'warning').mockReturnValue({} as ReturnType<ToastrService['warning']>);
    const erro = vi.spyOn(toast, 'error').mockReturnValue({} as ReturnType<ToastrService['error']>);
    component.deletarColaborador(monitor([1])); await Promise.resolve();
    expect(aviso).toHaveBeenCalledWith(mensagem, 'Exclusão não permitida');
    expect(erro).not.toHaveBeenCalled(); expect(component.isLoading).toBe(false);
  });

  afterEach(() => vi.restoreAllMocks());

  function configurarPerfil(papel: string, idsUnidades = [1]): void {
    vi.spyOn(TestBed.inject(Auth), 'hasRole').mockImplementation(role => role === papel);
    vi.spyOn(TestBed.inject(SessaoService), 'membro').mockReturnValue({
      id: 10, nomeCompleto: 'Solicitante', email: '', cpf: '', idPapel: 2,
      nomePapel: papel, unidades: idsUnidades.map(id => ({ id, nome: `Unidade ${id}` })),
    });
  }

  function monitor(idsUnidades: number[], nomePapel = 'MONITOR'): Colaborador {
    return { id: 20, nomeCompleto: 'Monitor teste', email: 'monitor@teste.com', cpf: '12345678900',
      endereco: 'Rua A', telefone: '11999999999', idPapel: 3, nomePapel, ativo: true,
      unidades: idsUnidades.map(id => ({ id, nome: `Unidade ${id}` })) };
  }

  it('exibe CPF com máscara no modal de detalhes', () => {
    component.colaboradorPreview = monitor([1]);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const rotulo = Array.from(fixture.nativeElement.querySelectorAll('.detalhes-campos dt'))
      .find((campo: any) => campo.textContent.trim() === 'CPF') as HTMLElement;
    expect(rotulo.nextElementSibling?.textContent?.trim()).toBe('123.456.789-00');
  });

  for (const ids of [[2], [1, 2]]) {
    it(`oculta editar e excluir quando o monitor tem unidade não permitida: ${ids}`, () => {
      configurarPerfil('COORDENADOR');
      component.colaboradores = [monitor(ids)];
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button[title="Editar"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('button[title="Mais ações"]')).toBeNull();
      component.executarAcao({ tipo: 'editar', linha: component.colaboradores[0] });
      expect(component.modalAberto).toBe(false);
    });
  }

  it('permite editar e excluir monitor somente das próprias unidades', () => {
    configurarPerfil('COORDENADOR', [1, 2]);
    component.colaboradores = [monitor([1, 2])];
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[title="Editar"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[title="Mais ações"]')).toBeTruthy();
    component.abrirEdicao(component.colaboradores[0]);
    expect(component.modalAberto).toBe(true);
  });

  it('não permite coordenador editar outro coordenador ou um monitor sem unidade', () => {
    configurarPerfil('COORDENADOR');
    component.abrirEdicao(monitor([1], 'COORDENADOR'));
    expect(component.modalAberto).toBe(false);
    component.abrirEdicao(monitor([]));
    expect(component.modalAberto).toBe(false);
  });

  it('preserva a edição do administrador em qualquer unidade', () => {
    configurarPerfil('ADMINISTRADOR', []);
    component.abrirEdicao(monitor([2]));
    expect(component.modalAberto).toBe(true);
  });

  it('bloqueia a chamada direta de exclusão antes de abrir a confirmação', () => {
    configurarPerfil('COORDENADOR');
    const confirmar = vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(true);
    const deletar = vi.spyOn(TestBed.inject(ColaboradorService), 'deletar');
    component.deletarColaborador(monitor([2]));
    expect(confirmar).not.toHaveBeenCalled();
    expect(deletar).not.toHaveBeenCalled();
  });

  it('reconfere a permissão original ao salvar mesmo se a unidade do formulário for trocada', () => {
    configurarPerfil('COORDENADOR');
    component.abrirEdicao(monitor([1]));
    component.formColaborador.patchValue({ nomeCompleto: 'Nome alterado', idsUnidades: [2] });
    vi.mocked(TestBed.inject(SessaoService).membro).mockReturnValue({
      id: 10, nomeCompleto: 'Solicitante', email: '', cpf: '', idPapel: 2,
      nomePapel: 'COORDENADOR', unidades: [{ id: 2, nome: 'Unidade 2' }],
    });
    const atualizar = vi.spyOn(TestBed.inject(ColaboradorService), 'atualizar');
    component.salvar();
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('oferece apenas as unidades vinculadas ao coordenador', () => {
    vi.spyOn(TestBed.inject(Auth), 'hasRole').mockReturnValue(true);
    vi.spyOn(TestBed.inject(UnidadeService), 'listarTodos').mockReturnValue(of([
      { id: 1, nome: 'Unidade 1' }, { id: 2, nome: 'Unidade 2' }, { id: 3, nome: 'Unidade 3' }
    ]));
    const sessao = vi.spyOn(TestBed.inject(SessaoService), 'carregar');
    for (const ids of [[1, 2], [3], []]) {
      sessao.mockReturnValue(of({ id: 10, nomeCompleto: 'Coordenador', email: '', cpf: '',
        idPapel: 2, nomePapel: 'COORDENADOR', unidades: ids.map(id => ({ id, nome: `Unidade ${id}` })) }));
      component.carregarUnidades();
      expect(component.unidadesDisponiveis.map(unidade => unidade.id)).toEqual(ids);
    }
  });

  it('oculta unidades e permite administrador sem vínculos manuais', () => {
    component.abrirCadastro();
    component.formColaborador.get('idPapel')!.setValue(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.unidades-box')).toBeNull();
    expect(component.formColaborador.get('idsUnidades')!.disabled).toBe(true);
    expect(component.formColaborador.value.idsUnidades).toBeUndefined();
  });

  it('volta a exigir unidades ao trocar administrador por coordenador ou monitor', () => {
    component.abrirCadastro();
    for (const idPapel of [2, 3]) {
      component.formColaborador.get('idPapel')!.setValue(1);
      component.formColaborador.get('idPapel')!.setValue(idPapel);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.unidades-box')).not.toBeNull();
      expect(component.formColaborador.get('idsUnidades')!.hasError('required')).toBe(true);
    }
  });

  it('oculta editar e excluir a própria conta e oferece Meu perfil', () => {
    configurarPerfil('ADMINISTRADOR');
    const propriaConta = { ...monitor([1], 'ADMINISTRADOR'), id: 10 };
    const acoes = component.acoesTabela.filter(acao => !acao.visivel || acao.visivel(propriaConta));

    expect(acoes.map(acao => acao.acao)).toEqual(['visualizar', 'meu-perfil']);
    component.abrirEdicao(propriaConta);
    expect(component.modalAberto).toBe(false);
    expect(component.podeGerenciarColaborador(monitor([1]))).toBe(true);
  });

  describe('situação do colaborador', () => {
    function acoesDe(colaborador: Colaborador): string[] {
      return component.acoesTabela.filter(acao => !acao.visivel || acao.visivel(colaborador)).map(acao => acao.acao);
    }

    it('mantém visualizar e editar visíveis e agrupa as demais ações no menu', () => {
      configurarPerfil('ADMINISTRADOR');
      const diretas = component.acoesTabela.filter(acao => !acao.menu).map(acao => acao.acao);
      expect(diretas).toEqual(['visualizar', 'meu-perfil', 'editar']);
      expect(acoesDe(monitor([1]))).toEqual(['visualizar', 'editar', 'desativar', 'excluir']);
      const inativo = { ...monitor([1]), ativo: false };
      expect(acoesDe(inativo)).toEqual(['visualizar', 'editar', 'reativar', 'excluir']);
      const excluir = component.acoesTabela.find(acao => acao.acao === 'excluir')!;
      expect(excluir.perigosa).toBe(true);
      expect(component.acoesTabela.find(acao => acao.acao === 'desativar')!.icone).toBe('person_off');
      expect(component.acoesTabela.find(acao => acao.acao === 'reativar')!.icone).toBe('person_check');
    });

    it('não oferece desativar a própria conta nem inativos fora das unidades do coordenador', () => {
      configurarPerfil('ADMINISTRADOR');
      expect(acoesDe({ ...monitor([1], 'ADMINISTRADOR'), id: 10 })).toEqual(['visualizar', 'meu-perfil']);
      configurarPerfil('COORDENADOR');
      expect(acoesDe({ ...monitor([2]), ativo: false })).toEqual(['visualizar']);
    });

    it('lista todos por padrão e permite filtrar ativos e inativos', () => {
      const listar = vi.spyOn(TestBed.inject(ColaboradorService), 'listarTodos')
        .mockReturnValue(of({ content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 10 } }));
      component.carregarColaboradores();
      expect(listar.mock.calls.at(-1)![6]).toBeNull();
      expect(component.quantidadeFiltrosAplicados).toBe(0);
      component.filtroSituacao = 'ativos';
      component.carregarColaboradores();
      expect(listar.mock.calls.at(-1)![6]).toBe(true);
      expect(component.quantidadeFiltrosAplicados).toBe(1);
      component.filtroSituacao = 'inativos';
      component.carregarColaboradores();
      expect(listar.mock.calls.at(-1)![6]).toBe(false);
      component.filtroSituacao = 'todos';
      component.carregarColaboradores();
      expect(listar.mock.calls.at(-1)![6]).toBeNull();
    });

    it('desativa somente após a confirmação e atualiza a listagem', async () => {
      configurarPerfil('ADMINISTRADOR');
      const confirmar = vi.spyOn(Alertas, 'confirmarDesativacaoColaborador').mockResolvedValue(true);
      const desativar = vi.spyOn(TestBed.inject(ColaboradorService), 'desativar')
        .mockReturnValue(of({ ...monitor([1]), ativo: false }));
      const recarregar = vi.spyOn(component, 'carregarColaboradores').mockImplementation(() => {});
      await component.desativarColaborador(monitor([1]));
      expect(confirmar).toHaveBeenCalledWith('Monitor teste');
      expect(desativar).toHaveBeenCalledWith(20);
      expect(recarregar).toHaveBeenCalled();
    });

    it('não desativa quando a confirmação é cancelada nem a própria conta', async () => {
      configurarPerfil('ADMINISTRADOR');
      const desativar = vi.spyOn(TestBed.inject(ColaboradorService), 'desativar');
      vi.spyOn(Alertas, 'confirmarDesativacaoColaborador').mockResolvedValue(false);
      await component.desativarColaborador(monitor([1]));
      await component.desativarColaborador({ ...monitor([1]), id: 10 });
      expect(desativar).not.toHaveBeenCalled();
    });

    it('reativar abre o formulário preenchido, com senha vazia e obrigatória', async () => {
      configurarPerfil('ADMINISTRADOR');
      vi.spyOn(Alertas, 'confirmarReativacaoColaborador').mockResolvedValue(true);
      component.executarAcao({ tipo: 'reativar', linha: { ...monitor([1]), ativo: false } });
      await Promise.resolve(); await Promise.resolve();
      fixture.detectChanges();
      expect(component.modalAberto).toBe(true);
      expect(component.modoReativacao).toBe(true);
      expect(component.formColaborador.value.email).toBe('monitor@teste.com');
      expect(component.formColaborador.value.senha).toBe('');
      expect(component.formColaborador.get('senha')!.hasError('required')).toBe(true);
      expect(fixture.nativeElement.querySelector('app-modal-layout h2, app-modal-layout .titulo')?.textContent)
        .toContain('Reativar colaborador');
      expect(fixture.nativeElement.textContent).toContain('Confirmar reativação');
    });

    it('cancelar a confirmação não abre o formulário de reativação', async () => {
      configurarPerfil('ADMINISTRADOR');
      vi.spyOn(Alertas, 'confirmarReativacaoColaborador').mockResolvedValue(false);
      component.executarAcao({ tipo: 'reativar', linha: { ...monitor([1]), ativo: false } });
      await Promise.resolve(); await Promise.resolve();
      expect(component.modalAberto).toBe(false);
    });

    it('envia dados revisados e nova senha em uma única solicitação', () => {
      configurarPerfil('ADMINISTRADOR');
      const reativar = vi.spyOn(TestBed.inject(ColaboradorService), 'reativar').mockReturnValue(of(monitor([1])));
      vi.spyOn(component, 'carregarColaboradores').mockImplementation(() => {});
      component.abrirReativacao({ ...monitor([1]), ativo: false });
      component.formColaborador.patchValue({ endereco: 'Rua Nova, 10', senha: 'Senha1ok', confirmarSenha: 'Senha1ok' });
      component.salvar();
      expect(reativar).toHaveBeenCalledTimes(1);
      const [id, dto] = reativar.mock.calls[0];
      expect(id).toBe(20);
      expect(dto).toMatchObject({ endereco: 'Rua Nova, 10', senha: 'Senha1ok', confirmacaoSenha: 'Senha1ok', idsUnidades: [1] });
      expect(component.modalAberto).toBe(false);
    });

    it('exige nova senha e mantém o formulário aberto e inativo em caso de erro', () => {
      configurarPerfil('ADMINISTRADOR');
      const reativar = vi.spyOn(TestBed.inject(ColaboradorService), 'reativar')
        .mockReturnValue(throwError(() => ({ status: 409, error: { message: 'Este CPF já está em uso por outro usuário.' } })));
      vi.spyOn(TestBed.inject(ToastrService), 'error').mockReturnValue({} as ReturnType<ToastrService['error']>);
      component.abrirReativacao({ ...monitor([1]), ativo: false });
      component.salvar();
      expect(reativar).not.toHaveBeenCalled();
      component.formColaborador.patchValue({ senha: 'Senha1ok', confirmarSenha: 'Senha1ok' });
      component.salvar();
      expect(reativar).toHaveBeenCalledTimes(1);
      expect(component.modalAberto).toBe(true);
      expect(component.modoReativacao).toBe(true);
      expect(component.isLoading).toBe(false);
    });

    it('confirma o descarte ao clicar fora da reativação mesmo sem editar os dados', async () => {
      configurarPerfil('ADMINISTRADOR');
      component.abrirReativacao({ ...monitor([1]), ativo: false });
      fixture.detectChanges();
      const descarte = vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
      const reativar = vi.spyOn(TestBed.inject(ColaboradorService), 'reativar');

      fixture.nativeElement.querySelector('.modal-backdrop').click();
      await fixture.whenStable();
      expect(descarte).toHaveBeenCalledWith(
        'Deseja descartar a reativação deste colaborador? O cadastro continuará inativo.');
      expect(component.modalAberto).toBe(true);
      expect(component.modoReativacao).toBe(true);

      descarte.mockResolvedValue(true);
      fixture.nativeElement.querySelector('.modal-backdrop').click();
      await fixture.whenStable();
      expect(component.modalAberto).toBe(false);
      expect(reativar).not.toHaveBeenCalled();
    });

    it('pede confirmação de descarte ao fechar a reativação com alterações e mantém o formulário se desistir', async () => {
      configurarPerfil('ADMINISTRADOR');
      component.abrirReativacao({ ...monitor([1]), ativo: false });
      component.formColaborador.patchValue({ senha: 'Senha1ok' });
      const descarte = vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
      component.fecharModal();
      await Promise.resolve(); await Promise.resolve();
      expect(descarte).toHaveBeenCalled();
      expect(component.modalAberto).toBe(true);
      expect(component.formColaborador.value.senha).toBe('Senha1ok');
      descarte.mockResolvedValue(true);
      component.fecharModal();
      await Promise.resolve(); await Promise.resolve();
      expect(component.modalAberto).toBe(false);
      expect(component.modoReativacao).toBe(false);
    });

    it('informa no formulário de edição que o cadastro está inativo e salva sem reativar', () => {
      configurarPerfil('ADMINISTRADOR');
      component.abrirEdicao({ ...monitor([1]), ativo: false });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.aviso-inativo')?.textContent).toContain('inativo');
      const atualizar = vi.spyOn(TestBed.inject(ColaboradorService), 'atualizar').mockReturnValue(of(monitor([1])));
      vi.spyOn(component, 'carregarColaboradores').mockImplementation(() => {});
      component.formColaborador.patchValue({ endereco: 'Outra rua, 5' });
      component.salvar();
      expect(atualizar).toHaveBeenCalledTimes(1);
      expect(atualizar.mock.calls[0][1]).not.toHaveProperty('ativo');
    });
  });
});
