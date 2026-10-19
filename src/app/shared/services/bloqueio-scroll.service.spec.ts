import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { Injector } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BloqueioScrollService } from './bloqueio-scroll.service';

describe('Bloqueio de rolagem das sobreposições', () => {
  let service: BloqueioScrollService;
  let liberar: Array<() => void>;
  let estiloCorpo: string;
  let estiloRaiz: string;

  beforeEach(() => {
    estiloCorpo = document.body.style.cssText;
    estiloRaiz = document.documentElement.style.cssText;
    liberar = [];
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'scrollX', 'get').mockReturnValue(12);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(640);
    service = Injector.create({ providers: [
      { provide: DOCUMENT, useValue: document },
      { provide: BloqueioScrollService, useClass: BloqueioScrollService }
    ] }).get(BloqueioScrollService);
  });

  afterEach(() => {
    liberar.forEach(fechar => fechar());
    document.body.style.cssText = estiloCorpo;
    document.documentElement.style.cssText = estiloRaiz;
    vi.restoreAllMocks();
  });

  it('fixa a página na posição atual', () => {
    liberar.push(service.bloquear());
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-640px');
    expect(document.body.style.left).toBe('-12px');
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('restaura os estilos anteriores e a posição ao fechar', () => {
    document.body.style.setProperty('padding-right', '7px', 'important');
    document.body.style.position = 'relative';
    document.documentElement.style.overflow = 'auto';
    const fechar = service.bloquear();
    liberar.push(fechar);
    fechar();
    expect(document.body.style.position).toBe('relative');
    expect(document.body.style.paddingRight).toBe('7px');
    expect(document.body.style.getPropertyPriority('padding-right')).toBe('important');
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(window.scrollTo).toHaveBeenCalledWith({ left: 12, top: 640, behavior: 'instant' });
  });

  it('mantém o bloqueio enquanto houver outra sobreposição aberta', () => {
    const primeiro = service.bloquear();
    const segundo = service.bloquear();
    liberar.push(primeiro, segundo);
    primeiro();
    expect(document.body.style.position).toBe('fixed');
    expect(window.scrollTo).not.toHaveBeenCalled();
    segundo();
    expect(document.body.style.position).not.toBe('fixed');
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });

  it('ignora liberações duplicadas', () => {
    const primeiro = service.bloquear();
    const segundo = service.bloquear();
    liberar.push(primeiro, segundo);
    primeiro();
    primeiro();
    expect(document.body.style.position).toBe('fixed');
    segundo();
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });
});
