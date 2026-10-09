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
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import Swal from 'sweetalert2';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true }))
  }
}));

describe('UsuarioPerfil', () => {
  let component: UsuarioPerfil;
  let fixture: ComponentFixture<UsuarioPerfil>;
  let usuarioService: {
    buscarPorId: ReturnType<typeof vi.fn>;
    inativar: ReturnType<typeof vi.fn>;
    transferirTurma: ReturnType<typeof vi.fn>;
    rematricular: ReturnType<typeof vi.fn>;
    deletar: ReturnType<typeof vi.fn>;
  };
  let toastr: { success: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };
  let sessaoService: {
    carregar: ReturnType<typeof vi.fn>;
    isMonitor: ReturnType<typeof vi.fn>;
    isCoordenador: ReturnType<typeof vi.fn>;
    temAcessoAUnidade: ReturnType<typeof vi.fn>;
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
      })),
      inativar: vi.fn(() => of(void 0)),
      transferirTurma: vi.fn(() => of({ id: 7, nomeCompleto: 'Aluno Sales da Silva', dataNascimento: '2018-09-11', idUnidade: 1, idTurma: 20 })),
      rematricular: vi.fn(() => of({ id: 7, nomeCompleto: 'Aluno Sales da Silva', dataNascimento: '2018-09-11', idUnidade: 1, idTurma: 20 })),
      deletar: vi.fn(() => of(void 0))
    };
    toastr = { success: vi.fn(), warning: vi.fn(), error: vi.fn(), clear: vi.fn() };
    router = { navigate: vi.fn(), navigateByUrl: vi.fn() };
    sessaoService = {
      carregar: vi.fn(() => of(null)),
      isMonitor: vi.fn(() => false),
      isCoordenador: vi.fn(() => false),
      temAcessoAUnidade: vi.fn(() => true),
      unidadesPermitidasIds: vi.fn(() => []),
      podeRemoverVinculo: vi.fn(() => true),
      podeExcluirUsuario: vi.fn(() => true)
    };

    await TestBed.configureTestingModule({
      imports: [UsuarioPerfil],
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: ContatoService, useValue: { buscarAutocomplete: vi.fn(() => of([])), atualizarContato: vi.fn() } },
        { provide: ToastrService, useValue: toastr },
        { provide: SessaoService, useValue: sessaoService },
        { provide: UnidadeService, useValue: { listarTodas: vi.fn(() => of([])) } },
        { provide: TurmaService, useValue: { listar: vi.fn(() => of([])) } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: (chave: string) => chave === 'id' ? '7' : null }),
            snapshot: { queryParamMap: { get: () => null } }
          }
        },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    vi.mocked(Swal.fire).mockClear();
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as any);
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

  it('troca a aba ativa mantendo os componentes separados por área', async () => {
    component.abaAtiva = 'saude';
    expect(component.abaAtiva).toBe('saude');
  });

  it('exibe a tabela de contatos vinculados na aba contatos', async () => {
    component.abaAtiva = 'contatos';
    expect(component.abaAtiva).toBe('contatos');
  });

  it('mostra campos obrigatorios ao tentar matricular novamente sem selecionar unidade e turma', () => {
    component.usuario = { ...component.usuario!, status: 'EGRESSO', statusMatricula: 'EGRESSO' };
    component.abrirModalRematricula();
    component.confirmarSelecaoTurma();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('A unidade é obrigatória.');
    expect(texto).toContain('A turma é obrigatória.');
  });

  it('mostra campos obrigatorios ao tentar transferir sem selecionar unidade e turma', () => {
    component.abrirModalTransferencia();
    component.formTransferencia.reset({ idUnidade: null, idTurmaNova: null });
    component.confirmarSelecaoTurma();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('A unidade é obrigatória.');
    expect(texto).toContain('A turma é obrigatória.');
  });

  it('exibe toast de sucesso ao desligar usuario', async () => {
    component.abrirModalDesligamento();
    component.formDesligamento.setValue({ justificativa: 'Mudanca de cidade' });

    await component.confirmarDesligamento();

    expect(usuarioService.inativar).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalledWith('Usuário desligado com sucesso.', 'Sucesso');
  });

  it('exibe toast de sucesso ao transferir usuario', async () => {
    component.turmasTransferencia = [{ id: 20, periodo: 'TARDE', horaInicio: '13:00', horaFim: '17:00', unidade: { id: 2, nome: 'Unidade B' } }];
    component.formTransferencia.get('idTurmaNova')?.enable();
    component.formTransferencia.setValue({ idUnidade: 2, idTurmaNova: 20 });

    await component.confirmarTransferencia();

    expect(usuarioService.transferirTurma).toHaveBeenCalledWith(7, 20);
    expect(toastr.success).toHaveBeenCalledWith('Usuário transferido com sucesso.', 'Sucesso');
  });

  it('usa usuário no texto de confirmação de transferência para outra unidade', async () => {
    component.turmasTransferencia = [{ id: 20, periodo: 'TARDE', horaInicio: '13:00', horaFim: '17:00', unidade: { id: 2, nome: 'Unidade B' } }];
    component.formTransferencia.get('idTurmaNova')?.enable();
    component.formTransferencia.setValue({ idUnidade: 2, idTurmaNova: 20 });

    await component.confirmarTransferencia();

    const chamadas = vi.mocked(Swal.fire).mock.calls;
    const html = (chamadas[chamadas.length - 1]?.[0] as any)?.html as string;
    expect(html).toContain('Você está transferindo o usuário para a unidade Unidade B');
    expect(html).not.toContain('transferindo o aluno');
  });

  it('exibe toast de sucesso ao matricular novamente usuario', async () => {
    component.usuario = { ...component.usuario!, status: 'EGRESSO', statusMatricula: 'EGRESSO' };
    component.modoSelecaoTurma = 'rematricula';
    component.turmasTransferencia = [{ id: 20, periodo: 'TARDE', horaInicio: '13:00', horaFim: '17:00', unidade: { id: 2, nome: 'Unidade B' } }];
    component.formTransferencia.get('idTurmaNova')?.enable();
    component.formTransferencia.setValue({ idUnidade: 2, idTurmaNova: 20 });

    await component.confirmarRematricula();

    expect(usuarioService.rematricular).toHaveBeenCalledWith(7, 20);
    expect(toastr.success).toHaveBeenCalledWith('Usuário matriculado novamente com sucesso.', 'Sucesso');
  });

  it('exibe toast de sucesso ao excluir usuario sem sweetalert de sucesso', async () => {
    await component.excluirUsuario();

    expect(usuarioService.deletar).toHaveBeenCalledWith(7);
    expect(toastr.success).toHaveBeenCalledWith('Usuário excluído com sucesso.', 'Sucesso');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    expect(Swal.fire).toHaveBeenCalledTimes(1);
  });

  it('volta para a URL de origem quando ela existe', () => {
    (component as any).returnUrl = '/dashboard/usuarios?aba=contatos&page=2';

    component.voltar();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard/usuarios?aba=contatos&page=2');
    expect(router.navigate).not.toHaveBeenCalled();
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
