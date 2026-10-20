import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AbasResponsivas } from './abas-responsivas';

@Component({
  imports: [AbasResponsivas],
  template: `<nav appAbasResponsivas>
    <button class="aba-btn" data-top="0">Primeira</button>
    <button class="aba-btn" [attr.data-top]="segundaLinha">Segunda</button>
  </nav>`
})
class ExemploAbas {
  segundaLinha = 48;
}

describe('Bordas das abas responsivas', () => {
  let aoRedimensionar: ResizeObserverCallback;

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: Number(this.dataset['top'] ?? 0) } as DOMRect;
    });
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { aoRedimensionar = callback; }
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('identifica a quebra real em mais de uma linha', () => {
    const fixture = TestBed.createComponent(ExemploAbas);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav').classList.contains('abas-quebradas')).toBe(true);
  });

  it('remove a borda completa quando as abas voltam a caber em uma linha', () => {
    const fixture = TestBed.createComponent(ExemploAbas);
    fixture.detectChanges();
    fixture.componentInstance.segundaLinha = 0;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    aoRedimensionar([], {} as ResizeObserver);
    expect(fixture.nativeElement.querySelector('nav').classList.contains('abas-quebradas')).toBe(false);
  });

  it('atualiza a quebra quando as abas mudam dinamicamente', async () => {
    const fixture = TestBed.createComponent(ExemploAbas);
    fixture.componentInstance.segundaLinha = 0;
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const novaAba = document.createElement('button');
    novaAba.className = 'aba-btn';
    novaAba.dataset['top'] = '48';
    nav.append(novaAba);
    await Promise.resolve();
    expect(nav.classList.contains('abas-quebradas')).toBe(true);
  });
});
