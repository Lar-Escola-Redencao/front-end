import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AcompanhamentoFrequencias } from './frequencias';
import { AcompanhamentoService, ResumoFrequencia } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { UsuarioResponseDTO, MatriculaHistoricoDTO } from 'src/app/shared/models/usuario.model';

const dados: ResumoFrequencia = { dataInicio: '2026-01-01', dataFim: '2026-12-31',
  meses: [{ ano: 2026, mes: 10, presencas: 3, faltas: 1 }], presencas: 3, faltas: 1, totalRegistros: 4 };
const vinculo = { id: 2, nomeUnidade: 'Sede São José', periodoTurma: 'MANHA',
  dataIngresso: '2025-01-01T08:00:00', dataDesligamento: null } as MatriculaHistoricoDTO;

describe('Gráficos do acompanhamento', () => {
  let api: { frequencias: ReturnType<typeof vi.fn>; matriculasFrequencia: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-29T10:00:00-03:00'));
    api = { frequencias: vi.fn(() => of(dados)), matriculasFrequencia: vi.fn(() => of([vinculo])) };
    TestBed.configureTestingModule({ imports: [AcompanhamentoFrequencias],
      providers: [{ provide: AcompanhamentoService, useValue: api }] });
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); vi.restoreAllMocks(); });
  function criar() {
    const fixture = TestBed.createComponent(AcompanhamentoFrequencias);
    fixture.componentRef.setInput('usuario', { id: 10 } as UsuarioResponseDTO); fixture.detectChanges();
    return fixture;
  }
  it('inicia no ano atual com todas as matrículas, dois gráficos e totais correspondentes', () => {
    const fixture = criar(); const c = fixture.componentInstance;
    expect(api.frequencias).toHaveBeenCalledWith(10, { inicio: '2026-01-01', fim: '2026-12-31', matricula: null });
    expect(c.meses()).toHaveLength(12); expect(c.percentualPresencas()).toBe(75);
    expect(fixture.nativeElement.querySelectorAll('.graficos svg')).toHaveLength(2);
    expect(c.rotuloMatricula(vinculo)).toContain('Sede São José - Manhã');
    expect(c.rotuloMatricula(vinculo)).toContain('01/01/2025');
  });
  it('mantém o filtro de matrícula e não consulta intervalo personalizado inválido', () => {
    const fixture = criar(); const c = fixture.componentInstance;
    c.form.patchValue({ periodo: 'PERSONALIZADO', matricula: 2, dataInicio: '2026-03-02', dataFim: '2026-03-01' });
    c.aplicar(); fixture.detectChanges();
    expect(api.frequencias).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('anterior');
    expect(fixture.nativeElement.querySelector('mat-select[formControlName="matricula"]')).toBeTruthy();
    c.form.patchValue({ dataFim: '2026-03-02' }); c.aplicar();
    expect(api.frequencias).toHaveBeenLastCalledWith(10, { inicio: '2026-03-02', fim: '2026-03-02', matricula: 2 });
  });
  it('ignora a resposta antiga quando os filtros mudam', () => {
    const antiga = new Subject<ResumoFrequencia>(); const atual = new Subject<ResumoFrequencia>();
    api.frequencias.mockReturnValueOnce(antiga).mockReturnValueOnce(atual);
    const fixture = criar(); const c = fixture.componentInstance;
    c.form.controls.periodo.setValue('MES_PASSADO'); c.alterarPeriodo();
    atual.next({ ...dados, presencas: 2, faltas: 0, totalRegistros: 2 });
    antiga.next(dados);
    expect(c.resumo()?.totalRegistros).toBe(2);
    expect(api.frequencias).toHaveBeenLastCalledWith(10, { inicio: '2026-09-01', fim: '2026-09-30', matricula: null });
  });
  it('mostra erro, permite tentar novamente e trata ausência de registros sem porcentagem inválida', () => {
    api.frequencias.mockReturnValueOnce(throwError(() => new Error('falha')));
    const fixture = criar(); const c = fixture.componentInstance;
    expect(c.erro()).toBeTruthy(); expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    api.frequencias.mockReturnValue(of({ ...dados, meses: [], presencas: 0, faltas: 0, totalRegistros: 0 }));
    c.aplicar(); fixture.detectChanges();
    expect(c.erro()).toBeNull(); expect(c.percentualPresencas()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Nenhuma frequência registrada');
  });
});
