import { DOCUMENT, ViewportScroller } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';

describe('Âncoras abaixo do menu público', () => {
  it('desconta a altura atual da navbar também na rolagem automática do Router', () => {
    let altura = 82;
    const setOffset = vi.fn();
    TestBed.configureTestingModule({ providers: [
      { provide: ViewportScroller, useValue: { setOffset } },
      { provide: DOCUMENT, useValue: { querySelector: () => ({ getBoundingClientRect: () => ({ bottom: altura }) }) } },
    ] });
    TestBed.runInInjectionContext(() => new App());
    const offset = setOffset.mock.calls[0][0];
    expect(offset()).toEqual([0, 90]);
    altura = 100;
    expect(offset()).toEqual([0, 108]);
  });
});
