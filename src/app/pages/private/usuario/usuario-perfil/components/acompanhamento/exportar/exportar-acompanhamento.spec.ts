import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { ExportarAcompanhamento } from './exportar-acompanhamento';
import { AcompanhamentoService } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { hojeBrasilia } from '../frequencias/periodos-frequencia';

describe('Exportar acompanhamento', () => {
  let fixture: ComponentFixture<ExportarAcompanhamento>;
  let component: ExportarAcompanhamento;
  let api: any;
  const arquivo = () => new HttpResponse({ body: new Blob(['x'], { type: 'application/pdf' }),
    headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="acompanhamento.pdf"' }) });
  const matricula = { id: 7, nomeUnidade: 'Sede', periodoTurma: 'MANHA', horaInicio: '07:00', horaFim: '12:00',
    dataIngresso: '2025-01-10T00:00:00', dataDesligamento: null };

  function montar(papel: 'adm' | 'coord' | 'monitor') {
    api = { matriculasFrequencia: vi.fn(() => of([matricula])), exportarRelatorio: vi.fn(() => of(arquivo())) };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    TestBed.configureTestingModule({ imports: [ExportarAcompanhamento], providers: [
      { provide: AcompanhamentoService, useValue: api },
      { provide: ToastrService, useValue: { success: vi.fn() } },
      { provide: SessaoService, useValue: { isAdministrador: () => papel === 'adm', isCoordenador: () => papel === 'coord' } },
    ] });
    fixture = TestBed.createComponent(ExportarAcompanhamento);
    component = fixture.componentInstance;
    component.usuario = { id: 10 } as any;
    fixture.detectChanges();
  }
  afterEach(() => { fixture?.destroy(); vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it('usa ano atual e todas as matrículas por padrão e mantém o modal aberto após baixar', () => {
    montar('adm');
    const fechou = vi.fn(); component.closed.subscribe(fechou);
    component.gerar();
    const ano = hojeBrasilia().slice(0, 4);
    expect(api.exportarRelatorio).toHaveBeenCalledWith(10, { inicio: `${ano}-01-01`, fim: `${ano}-12-31`, matricula: null, formato: 'PDF' });
    expect(fechou).not.toHaveBeenCalled();
    expect(component.gerando()).toBe(false);
  });

  it('exporta XLSX e bloqueia datas anteriores à primeira matrícula', () => {
    montar('adm');
    component.usuario = { id: 10, dataPrimeiraMatricula: '2026-02-01T08:00:00' } as any;
    component.form.patchValue({ periodo: 'PERSONALIZADO', dataInicio: '2026-01-31', dataFim: '2026-03-01', formato: 'XLSX' });
    component.gerar(); fixture.detectChanges();
    expect(api.exportarRelatorio).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#erro-periodo-exportacao-inicio').textContent).toContain('primeira matrícula');
    expect(fixture.nativeElement.querySelector('input[formControlName="dataInicio"]').min).toBe('2026-02-01');
    component.form.patchValue({ dataInicio: '2026-02-01' });
    component.gerar();
    expect(api.exportarRelatorio).toHaveBeenCalledWith(10, {
      inicio: '2026-02-01', fim: '2026-03-01', matricula: null, formato: 'XLSX',
    });
    component.form.controls.periodo.setValue('ESTE_ANO'); component.alterarPeriodo();
    expect(component.form.controls.dataInicio.value).toBe('2026-02-01');
  });

  it('envia a matrícula escolhida e usa o mesmo rótulo da frequência', () => {
    montar('coord');
    component.form.patchValue({ matricula: 7 });
    component.gerar();
    expect(api.exportarRelatorio.mock.calls[0][1].matricula).toBe(7);
    expect(component.rotuloMatricula(matricula as any)).toBe('Sede - Manhã (10/01/2025 a hoje)');
  });

  it('descreve entrevistas somente para administradores e coordenadores', () => {
    montar('monitor');
    expect(fixture.nativeElement.textContent).toContain('frequências e ocorrências');
    expect(fixture.nativeElement.textContent).not.toContain('entrevistas');
    fixture.destroy(); TestBed.resetTestingModule(); vi.restoreAllMocks();
    montar('adm');
    expect(fixture.nativeElement.textContent).toContain('frequências, ocorrências e entrevistas');
    expect(fixture.nativeElement.textContent).toContain('entrevistas são consultadas pelo usuário e pelo período');
  });

  it('valida período personalizado, impede duplicidade e permite nova tentativa após falha', async () => {
    montar('adm');
    component.form.patchValue({ periodo: 'PERSONALIZADO', dataInicio: '2026-05-02', dataFim: '2026-05-01' });
    fixture.detectChanges();
    component.gerar(); fixture.detectChanges();
    expect(api.exportarRelatorio).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#erro-periodo-exportacao').textContent).toContain('data final');

    const pendente = new Subject<HttpResponse<Blob>>();
    api.exportarRelatorio.mockReturnValueOnce(pendente);
    component.form.patchValue({ dataFim: '2026-05-03' });
    component.gerar(); component.gerar();
    expect(api.exportarRelatorio).toHaveBeenCalledTimes(1);
    expect(component.gerando()).toBe(true);
    pendente.error(new HttpErrorResponse({ status: 500 }));
    await vi.waitFor(() => expect(component.erro()).toBe('Não foi possível gerar o relatório. Tente novamente.'));
    expect(component.gerando()).toBe(false);
    component.gerar();
    expect(api.exportarRelatorio).toHaveBeenCalledTimes(2);
  });
});
