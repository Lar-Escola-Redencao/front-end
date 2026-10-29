import { TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { AjudaAcompanhamento } from './ajuda-acompanhamento';

describe('Dicas do acompanhamento', () => {
  it('omite a data somente na orientação de ocorrência do Diário', () => {
    const fixture = TestBed.createComponent(AjudaAcompanhamento);
    expect(fixture.componentInstance.texto).toContain('Informe data, horário');
    fixture.componentRef.setInput('diario', true);
    expect(fixture.componentInstance.texto).toContain('Informe horário, tipo');
    expect(fixture.componentInstance.texto).not.toContain('Informe data');
  });
  it('abre somente ao clicar e fecha ao clicar novamente', async () => {
    const fixture = TestBed.createComponent(AjudaAcompanhamento);
    fixture.detectChanges();
    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    botao.dispatchEvent(new MouseEvent('mouseenter')); fixture.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    botao.click(); fixture.detectChanges(); await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(botao.getAttribute('aria-expanded')).toBe('true');
    expect(overlay.querySelector('.dica-painel')?.textContent).toContain('fatos pontuais');
    botao.click(); fixture.detectChanges();
    expect(overlay.querySelector('.dica-painel')).toBeNull();
  });

  it('mostra a orientação de entrevista e fecha com Escape ou clique fora', async () => {
    const fixture = TestBed.createComponent(AjudaAcompanhamento);
    fixture.componentRef.setInput('entrevista', true); fixture.detectChanges();
    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    botao.click(); fixture.detectChanges(); await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('.dica-painel')?.textContent).toContain('evolução do acompanhamento');
    botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fixture.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    botao.click(); fixture.detectChanges(); await fixture.whenStable();
    (overlay.querySelector('.cdk-overlay-backdrop') as HTMLElement).click(); fixture.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('false');
  });
});
