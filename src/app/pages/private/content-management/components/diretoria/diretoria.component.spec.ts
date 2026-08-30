import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { DiretoriaComponent } from './diretoria.component';
import { DiretoriaService } from '../../../../../shared/services/content-management/diretoria/diretoria.service';
import { Alertas } from '../../../../../shared/utils/alerts';
import { Diretoria } from '../../../../../shared/models/diretoria.model';

describe('DiretoriaComponent', () => {
  let component: DiretoriaComponent;
  let fixture: ComponentFixture<DiretoriaComponent>;
  let diretoriaService: {
    listarTodos: ReturnType<typeof vi.fn>;
    buscarPorId: ReturnType<typeof vi.fn>;
    criar: ReturnType<typeof vi.fn>;
    atualizar: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    fotoUrl: ReturnType<typeof vi.fn>;
  };
  let toastr: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const membro: Diretoria = {
    id: 1,
    nome: 'Maria Silva',
    cargo: 'Presidente',
    foto: '/uploads/maria.jpg',
    ativo: true
  };

  beforeEach(async () => {
    diretoriaService = {
      listarTodos: vi.fn().mockReturnValue(of([])),
      buscarPorId: vi.fn(),
      criar: vi.fn(),
      atualizar: vi.fn(),
      delete: vi.fn(),
      fotoUrl: vi.fn()
    };

    toastr = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DiretoriaComponent],
      providers: [
        provideAnimations(),
        { provide: DiretoriaService, useValue: diretoriaService },
        { provide: ToastrService, useValue: toastr }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DiretoriaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve configurar acao de exclusao na tabela', () => {
    expect(component.acoesTabela).toContainEqual(
      expect.objectContaining({
        icone: 'delete',
        tooltip: 'Excluir',
        acao: 'excluir'
      })
    );
  });

  it('deve confirmar antes de excluir membro da diretoria', fakeAsync(() => {
    vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(true);
    diretoriaService.delete.mockReturnValue(of(void 0));

    component.executarAcao({ tipo: 'excluir', linha: membro });
    flushMicrotasks();
    tick();

    expect(Alertas.confirmarExclusao).toHaveBeenCalled();
    expect(diretoriaService.delete).toHaveBeenCalledWith(membro.id);
  }));

  it('nao deve chamar API quando exclusao for cancelada', fakeAsync(() => {
    vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(false);

    component.excluirDiretoria(membro);
    flushMicrotasks();

    expect(diretoriaService.delete).not.toHaveBeenCalled();
  }));

  it('deve recarregar lista e exibir sucesso ao excluir', fakeAsync(() => {
    vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(true);
    diretoriaService.delete.mockReturnValue(of(void 0));

    component.excluirDiretoria(membro);
    flushMicrotasks();
    tick();

    expect(component.isLoading).toBeFalsy();
    expect(diretoriaService.listarTodos).toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalledWith(
      'Membro da diretoria excluido com sucesso.',
      'Sucesso'
    );
  }));

  it('deve exibir erro quando exclusao falhar', fakeAsync(() => {
    vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(true);
    diretoriaService.delete.mockReturnValue(
      throwError(() => ({
        error: { message: 'Nao foi possivel excluir.' }
      }))
    );

    component.excluirDiretoria(membro);
    flushMicrotasks();
    tick();

    expect(component.isLoading).toBeFalsy();
    expect(toastr.error).toHaveBeenCalledWith(
      'Nao foi possivel excluir.',
      'Erro'
    );
  }));
});
