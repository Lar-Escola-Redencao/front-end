import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { ExportarRelatorio, mesDaData, periodoValido } from './exportar-relatorio';
import { DiarioService } from 'src/app/shared/services/diario/diario.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { FormBuilder } from '@angular/forms';
import { OverlayContainer } from '@angular/cdk/overlay';

describe('Exportar relatório do diário', () => {
  let fixture: ComponentFixture<ExportarRelatorio>;
  let component: ExportarRelatorio;
  let api: any;
  let toastr: any;
  const turmas = [
    { id: 2, unidade: { id: 1, nome: 'Centro' }, periodo: 'MANHA', horaInicio: '07:00', horaFim: '11:00' },
    { id: 3, unidade: { id: 1, nome: 'Centro' }, periodo: 'TARDE', horaInicio: '13:00', horaFim: '17:00' },
    { id: 4, unidade: { id: 6, nome: 'Bezerra de Menezes' }, periodo: 'MANHA', horaInicio: '07:00', horaFim: '11:00' },
    { id: 5, unidade: { id: 6, nome: 'Bezerra de Menezes' }, periodo: 'TARDE', horaInicio: '13:00', horaFim: '17:00' },
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
    fixture.componentRef.setInput('unidades', [{ id: 1, nome: 'Centro' }, { id: 6, nome: 'Bezerra de Menezes' }]);
    fixture.componentRef.setInput('idUnidade', 1);
    fixture.componentRef.setInput('idTurma', 2);
    fixture.componentRef.setInput('data', '2028-02-10');
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); vi.restoreAllMocks(); });

  it('abre a dica fora da área rolável e fecha com Escape ou clique fora sem fechar o modal', async () => {
    const fechado = vi.fn(); component.closed.subscribe(fechado);
    const botao = fixture.nativeElement.querySelector('[aria-label="Entenda os tipos de relatório"]') as HTMLElement;
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    botao.dispatchEvent(new MouseEvent('mouseenter')); fixture.detectChanges();
    expect(overlay.querySelector('.ajuda-tipos-painel')).toBeNull();
    botao.click(); fixture.detectChanges(); await fixture.whenStable();
    const painel = overlay.querySelector('.ajuda-tipos-painel');
    expect(painel?.textContent).toContain('Resumo de frequência');
    expect(fixture.nativeElement.querySelector('.modal-card').contains(painel)).toBe(false);
    botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fixture.detectChanges();
    expect(overlay.querySelector('.ajuda-tipos-painel')).toBeNull();
    botao.click(); fixture.detectChanges(); await fixture.whenStable();
    (overlay.querySelector('.cdk-overlay-backdrop') as HTMLElement).click(); fixture.detectChanges();
    expect(overlay.querySelector('.ajuda-tipos-painel')).toBeNull();
    expect(fechado).not.toHaveBeenCalled();
  });

  it('preenche os filtros com a unidade, a turma e o mês do diário', () => {
    expect(component.formPresencas.getRawValue()).toMatchObject({
      idUnidade: 1, idTurma: 2, dataInicio: '2028-02-01', dataFim: '2028-02-29', formato: 'PDF', incluirOcorrencias: true
    });
    expect(component.formResumo.getRawValue().idsTurmas).toEqual([2]);
    expect(component.turmasDaUnidade().map(t => t.id)).toEqual([2, 3]);
    expect(component.turmasPorUnidade().flatMap(g => g.turmas.map(t => t.id))).toEqual([2, 3, 4, 5]);
  });

  it('trata meses de 28, 30 e 31 dias', () => {
    expect(mesDaData('2026-02-15').dataFim).toBe('2026-02-28');
    expect(mesDaData('2026-04-15').dataFim).toBe('2026-04-30');
    expect(mesDaData('2026-03-15').dataFim).toBe('2026-03-31');
  });

  it('seleciona todas as turmas disponíveis pelo seletor e permite desmarcar todas', async () => {
    component.selecionarTipo('RESUMO'); fixture.detectChanges();
    fixture.nativeElement.querySelector('mat-select[aria-label="Turmas"] .mat-mdc-select-trigger').click();
    fixture.detectChanges(); await fixture.whenStable();
    const painel = TestBed.inject(OverlayContainer).getContainerElement();
    const opcao = painel.querySelector('.opcao-todas') as HTMLElement;
    expect(opcao).toBeTruthy(); (opcao as HTMLElement).click(); fixture.detectChanges();
    expect(opcao.getAttribute('aria-selected')).toBe('true');
    expect(component.formResumo.controls.idsTurmas.value).toEqual([2, 3, 4, 5]);
    const gatilho = fixture.nativeElement.querySelector('mat-select[aria-label="Turmas"] .mat-mdc-select-trigger') as HTMLElement;
    gatilho.click(); fixture.detectChanges(); await fixture.whenStable();
    gatilho.click(); fixture.detectChanges(); await fixture.whenStable();
    const reaberta = painel.querySelector('.opcao-todas') as HTMLElement;
    expect(reaberta.getAttribute('aria-selected')).toBe('true');
    expect(reaberta.querySelector('.indicador-selecao')?.classList.contains('mat-pseudo-checkbox-checked')).toBe(true);
    component.gerar();
    expect(api.exportarResumo).toHaveBeenCalledWith(expect.objectContaining({ idsTurmas: [2, 3, 4, 5] }));
    reaberta.click(); fixture.detectChanges();
    expect(reaberta.getAttribute('aria-selected')).toBe('false');
    expect(component.formResumo.controls.idsTurmas.value).toEqual([]);
    expect(component.formResumo.controls.idsTurmas.hasError('required')).toBe(true);
  });

  it('seleciona por unidade, preserva as demais e reflete a seleção parcial dos filhos', async () => {
    component.selecionarTipo('RESUMO'); fixture.detectChanges();
    fixture.nativeElement.querySelector('mat-select[aria-label="Turmas"] .mat-mdc-select-trigger').click();
    fixture.detectChanges(); await fixture.whenStable();
    const painel = TestBed.inject(OverlayContainer).getContainerElement();
    const unidade = (nome: string) => Array.from(painel.querySelectorAll('.opcao-unidade'))
      .find(o => o.textContent?.includes(nome)) as HTMLElement;
    expect(unidade('Centro').getAttribute('aria-label')).toContain('parcial');
    unidade('Bezerra').click(); fixture.detectChanges();
    expect(component.formResumo.controls.idsTurmas.value).toEqual([2, 4, 5]);
    expect(unidade('Bezerra').getAttribute('aria-selected')).toBe('true');
    unidade('Centro').click(); fixture.detectChanges();
    expect(painel.querySelector('.opcao-todas')?.getAttribute('aria-selected')).toBe('true');
    const tardeCentro = painel.querySelector('[data-turma="3"]') as HTMLElement;
    tardeCentro.click(); fixture.detectChanges();
    expect(component.formResumo.controls.idsTurmas.value).toEqual([2, 4, 5]);
    expect(unidade('Centro').getAttribute('aria-label')).toContain('parcial');
    expect(painel.querySelector('.opcao-todas .indicador-selecao')?.classList.contains('mat-pseudo-checkbox-indeterminate')).toBe(true);
    unidade('Bezerra').click(); fixture.detectChanges();
    expect(component.formResumo.controls.idsTurmas.value).toEqual([2]);
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

  it('gera o detalhado, baixa o arquivo e mantém o modal aberto', () => {
    const fechado = vi.fn();
    component.closed.subscribe(fechado);
    component.gerar();
    expect(api.exportarPresencas).toHaveBeenCalledWith({
      idTurma: 2, dataInicio: '2028-02-01', dataFim: '2028-02-29', formato: 'PDF', incluirOcorrencias: true
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(fechado).not.toHaveBeenCalled();
  });

  it.each(['PRESENCAS', 'RESUMO'] as const)('mostra o limite abaixo da data final em %s', tipo => {
    component.selecionarTipo(tipo);
    component.formAtual.patchValue({ dataInicio: '2025-01-01', dataFim: '2027-01-01' });
    component.gerar();
    fixture.detectChanges();
    const mensagem = fixture.nativeElement.querySelector('#erro-data-fim');
    expect(mensagem?.textContent).toContain('366 dias');
    expect(mensagem?.parentElement.querySelector('input[formControlName="dataFim"]')).toBeTruthy();
    expect(api.exportarPresencas).not.toHaveBeenCalled();
    expect(api.exportarResumo).not.toHaveBeenCalled();
  });

  it('mantém o resumo aberto após baixar e permite exportar novamente', () => {
    const fechado = vi.fn();
    component.closed.subscribe(fechado);
    component.selecionarTipo('RESUMO');
    component.gerar();
    component.gerar();
    expect(api.exportarResumo).toHaveBeenCalledTimes(2);
    expect(fechado).not.toHaveBeenCalled();
  });

  it('isola o clique do download dos ouvintes externos e mantém o modal aberto', () => {
    const fechado = vi.fn();
    const cliqueExterno = vi.fn();
    const observarDownload = (evento: Event) => {
      if (evento.target instanceof HTMLAnchorElement) cliqueExterno(evento);
    };
    component.closed.subscribe(fechado);
    const pendente = new Subject<HttpResponse<Blob>>();
    api.exportarPresencas.mockReturnValue(pendente);
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementation(function (this: HTMLAnchorElement) {
      this.addEventListener('click', evento => evento.preventDefault());
      this.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    document.addEventListener('click', observarDownload);
    try {
      fixture.nativeElement.querySelector('button[type="submit"]').click();
      pendente.next(arquivo());
      fixture.detectChanges();
      expect(api.exportarPresencas).toHaveBeenCalledTimes(1);
      expect(fechado).not.toHaveBeenCalled();
      expect(cliqueExterno).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('app-modal-layout')).toBeTruthy();
    } finally {
      document.removeEventListener('click', observarDownload);
    }
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
