import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { ExportarRelatorio, mesDaData, periodoValido } from './exportar-relatorio';
import { DiarioService } from 'src/app/shared/services/diario/diario.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { FormBuilder } from '@angular/forms';

describe('Exportar relatório do diário', () => {
  let fixture: ComponentFixture<ExportarRelatorio>;
  let component: ExportarRelatorio;
  let api: any;
  let toastr: any;
  const turmas = [
    { id: 2, unidade: { id: 1, nome: 'Centro' }, periodo: 'MANHA', horaInicio: '07:00', horaFim: '11:00' },
    { id: 3, unidade: { id: 1, nome: 'Centro' }, periodo: 'TARDE', horaInicio: '13:00', horaFim: '17:00' },
    { id: 9, unidade: { id: 5, nome: 'Sem acesso' }, periodo: 'MANHA', horaInicio: '07:00', horaFim: '11:00' }
  ];
  const arquivo = () => new HttpResponse({
    body: new Blob(['x'], { type: 'application/pdf' }),
    headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="presencas.pdf"' })
  });

  beforeEach(() => {
    api = { exportarPresencas: vi.fn(() => of(arquivo())), exportarResumo: vi.fn(() => of(arquivo())) };
    toastr = { success: vi.fn(), error: vi.fn() };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    TestBed.configureTestingModule({ imports: [ExportarRelatorio], providers: [
      { provide: DiarioService, useValue: api },
      { provide: TurmaService, useValue: { listar: () => of(turmas) } },
      { provide: ToastrService, useValue: toastr }
    ] });
    fixture = TestBed.createComponent(ExportarRelatorio);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('unidades', [{ id: 1, nome: 'Centro' }]);
    fixture.componentRef.setInput('idUnidade', 1);
    fixture.componentRef.setInput('idTurma', 2);
    fixture.componentRef.setInput('data', '2028-02-10');
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); vi.restoreAllMocks(); });

  it('preenche os filtros com a unidade, a turma e o mês do diário', () => {
    expect(component.formPresencas.getRawValue()).toMatchObject({
      idUnidade: 1, idTurma: 2, dataInicio: '2028-02-01', dataFim: '2028-02-29', formato: 'PDF', incluirOcorrencias: true
    });
    expect(component.formResumo.getRawValue().idsTurmas).toEqual([2]);
    expect(component.turmasDaUnidade().map(t => t.id)).toEqual([2, 3]);
    expect(component.turmasPorUnidade().flatMap(g => g.turmas.map(t => t.id))).toEqual([2, 3]);
  });

  it('trata meses de 28, 30 e 31 dias', () => {
    expect(mesDaData('2026-02-15').dataFim).toBe('2026-02-28');
    expect(mesDaData('2026-04-15').dataFim).toBe('2026-04-30');
    expect(mesDaData('2026-03-15').dataFim).toBe('2026-03-31');
  });

  it('impede data final anterior à inicial e períodos acima do limite', () => {
    const fb = new FormBuilder();
    expect(periodoValido(fb.group({ dataInicio: '2026-03-10', dataFim: '2026-03-09' }))).toEqual({ fimAntesDoInicio: true });
    expect(periodoValido(fb.group({ dataInicio: '2025-01-01', dataFim: '2026-01-02' }))).toEqual({ periodoLongo: true });
    component.formPresencas.patchValue({ dataFim: '2028-01-01' });
    component.gerar();
    expect(api.exportarPresencas).not.toHaveBeenCalled();
    expect(component.erroPeriodo).toContain('anterior');
  });

  it('gera o detalhado, baixa o arquivo e fecha o modal', () => {
    const fechado = vi.fn();
    component.closed.subscribe(fechado);
    component.gerar();
    expect(api.exportarPresencas).toHaveBeenCalledWith({
      idTurma: 2, dataInicio: '2028-02-01', dataFim: '2028-02-29', formato: 'PDF', incluirOcorrencias: true
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(fechado).toHaveBeenCalled();
  });

  it('não envia solicitações duplicadas enquanto gera', () => {
    const pendente = new Subject<HttpResponse<Blob>>();
    api.exportarResumo.mockReturnValue(pendente);
    component.selecionarTipo('RESUMO');
    component.formResumo.patchValue({ idsTurmas: [2, 3], formato: 'XLSX' });
    component.gerar();
    component.gerar();
    expect(api.exportarResumo).toHaveBeenCalledTimes(1);
    expect(component.gerando()).toBe(true);
  });

  it('exibe a mensagem da API e permite nova tentativa', async () => {
    const corpo = new Blob([JSON.stringify({ message: 'O usuário não possui permissão de acesso a esta unidade.' })]);
    api.exportarPresencas.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403, error: corpo })));
    component.gerar();
    await vi.waitFor(() => expect(component.erro()).toBe('O usuário não possui permissão de acesso a esta unidade.'));
    expect(component.gerando()).toBe(false);
    component.gerar();
    expect(api.exportarPresencas).toHaveBeenCalledTimes(2);
  });
});
