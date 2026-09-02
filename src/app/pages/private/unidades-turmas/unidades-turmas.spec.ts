import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UnidadesTurmas } from './unidades-turmas';
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { Turma } from 'src/app/shared/models/turma.model';

describe('UnidadesTurmas', () => {
  let component: UnidadesTurmas;
  let fixture: ComponentFixture<UnidadesTurmas>;

  let unidadeService: {
    listarTodas: ReturnType<typeof vi.fn>;
    buscarPorId: ReturnType<typeof vi.fn>;
    criar: ReturnType<typeof vi.fn>;
    atualizar: ReturnType<typeof vi.fn>;
    deletar: ReturnType<typeof vi.fn>;
  };

  let turmaService: {
    listar: ReturnType<typeof vi.fn>;
    buscarPorId: ReturnType<typeof vi.fn>;
    criar: ReturnType<typeof vi.fn>;
    atualizar: ReturnType<typeof vi.fn>;
    deletar: ReturnType<typeof vi.fn>;
  };

  let toastr: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const unidades: Unidade[] = [
    {
      id: 1,
      nome: 'Sede',
      endereco: 'Rua A',
      telefone: '(11) 1111-1111',
      email: 'sede@ler.org',
      diasFuncionamento: 'SEG;TER;QUA;QUI;SEX',
      horarioAbertura: '08:00',
      horarioFechamento: '18:00',
      idadeMin: 6,
      idadeMax: 12,
      corHex: '#F5F5F5',
    },
  ];

  const turma: Turma = {
    id: 1,
    periodo: 'MANHA',
    horaInicio: '08:00',
    horaFim: '12:00',
    unidade: { id: 1, nome: 'Sede' },
  };

  function configurarTestBed(): void {
    unidadeService = {
      listarTodas: vi.fn().mockReturnValue(of(unidades)),
      buscarPorId: vi.fn(),
      criar: vi.fn(),
      atualizar: vi.fn(),
      deletar: vi.fn(),
    };

    turmaService = {
      listar: vi.fn().mockReturnValue(of([turma])),
      buscarPorId: vi.fn(),
      criar: vi.fn(),
      atualizar: vi.fn(),
      deletar: vi.fn(),
    };

    toastr = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
  }

  beforeEach(async () => {
    configurarTestBed();

    await TestBed.configureTestingModule({
      imports: [UnidadesTurmas],
      providers: [
        provideAnimations(),
        { provide: UnidadeService, useValue: unidadeService },
        { provide: TurmaService, useValue: turmaService },
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UnidadesTurmas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carrega a lista de turmas ao iniciar', () => {
    expect(turmaService.listar).toHaveBeenCalledWith(null);
    expect(component.turmas).toEqual([turma]);
  });

  it('refaz o Listar com o unidadeId ao trocar o filtro de unidade', () => {
    component.onFiltroUnidadeChange({ target: { value: '1' } } as unknown as Event);

    expect(component.unidadeFiltroId).toBe(1);
    expect(turmaService.listar).toHaveBeenLastCalledWith(1);
  });

  it('volta a listar sem unidadeId ao selecionar "Todas as unidades"', () => {
    component.onFiltroUnidadeChange({ target: { value: '1' } } as unknown as Event);
    component.onFiltroUnidadeChange({ target: { value: '' } } as unknown as Event);

    expect(component.unidadeFiltroId).toBeNull();
    expect(turmaService.listar).toHaveBeenLastCalledWith(null);
  });

  it('carrega as unidades e desmarca o estado de carregamento', () => {
    expect(unidadeService.listarTodas).toHaveBeenCalled();
    expect(component.unidades).toEqual(unidades);
    expect(component.carregandoUnidades).toBe(false);
    expect(component.erroCarregarUnidades).toBe(false);
  });

  it('sinaliza erro no select de unidades quando o carregamento falha', () => {
    unidadeService.listarTodas.mockReturnValue(throwError(() => new Error('falha de rede')));

    component.carregarUnidades();

    expect(component.carregandoUnidades).toBe(false);
    expect(component.erroCarregarUnidades).toBe(true);
    expect(toastr.error).toHaveBeenCalledWith(
      'Não foi possível carregar a lista de unidades.',
      'Erro',
    );
  });

  it('exige a seleção de uma unidade para o formulário ser válido', () => {
    component.abrirCadastroTurma();

    component.formTurma.patchValue({
      periodo: 'MANHA',
      horaInicio: '08:00',
      horaFim: '12:00',
      unidadeId: null,
    });

    expect(component.formTurma.invalid).toBe(true);
    expect(component.formTurma.get('unidadeId')?.hasError('required')).toBe(true);
  });

  it('marca horaFim como inválido quando não é maior que horaInicio', () => {
    component.abrirCadastroTurma();

    component.formTurma.patchValue({
      periodo: 'MANHA',
      horaInicio: '10:00',
      horaFim: '09:00',
      unidadeId: 1,
    });

    expect(component.formTurma.get('horaFim')?.hasError('horarioInvalido')).toBe(true);
    expect(component.formTurma.invalid).toBe(true);
  });

  it('limpa o erro de horário quando horaFim passa a ser maior que horaInicio', () => {
    component.abrirCadastroTurma();

    component.formTurma.patchValue({
      periodo: 'MANHA',
      horaInicio: '10:00',
      horaFim: '09:00',
      unidadeId: 1,
    });
    expect(component.formTurma.get('horaFim')?.hasError('horarioInvalido')).toBe(true);

    component.formTurma.patchValue({ horaFim: '11:00' });
    expect(component.formTurma.get('horaFim')?.hasError('horarioInvalido')).toBe(false);
  });

  it('pré-seleciona a unidade da turma na edição, convertendo o id para número', () => {
    component.abrirEdicaoTurma({
      ...turma,
      unidade: { id: '1' as unknown as number, nome: 'Sede' },
    });

    expect(component.formTurma.value.unidadeId).toBe(1);
  });

  it('envia o payload com o unidadeId correto ao criar uma turma', fakeAsync(() => {
    turmaService.criar.mockReturnValue(of(turma));

    component.abrirCadastroTurma();
    component.formTurma.setValue({
      periodo: 'TARDE',
      horaInicio: '13:00',
      horaFim: '17:00',
      unidadeId: 1,
    });

    component.salvarTurma();
    flushMicrotasks();
    tick();

    expect(turmaService.criar).toHaveBeenCalledWith({
      periodo: 'TARDE',
      horaInicio: '13:00',
      horaFim: '17:00',
      unidadeId: 1,
    });
    expect(toastr.success).toHaveBeenCalledWith('Turma cadastrada com sucesso.', 'Sucesso');
  }));

  it('bloqueia o salvamento quando não há unidades cadastradas', () => {
    unidadeService.listarTodas.mockReturnValue(of([]));
    component.carregarUnidades();

    component.abrirCadastroTurma();
    component.formTurma.setValue({
      periodo: 'TARDE',
      horaInicio: '13:00',
      horaFim: '17:00',
      unidadeId: 1,
    });

    component.salvarTurma();

    expect(turmaService.criar).not.toHaveBeenCalled();
  });
});
