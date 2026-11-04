import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { vi } from 'vitest';
import { Home } from './home';

describe('Retorno aos próximos eventos', () => {
  let fixture: ComponentFixture<Home>;
  let scroll: ReturnType<typeof vi.fn>;
  let route: { snapshot: { fragment: string | null } };
  let frame: FrameRequestCallback | undefined;

  beforeEach(async () => {
    frame = undefined;
    route = { snapshot: { fragment: 'eventos' } };
    TestBed.configureTestingModule({ imports: [Home], providers: [{ provide: ActivatedRoute, useValue: route }] });
    TestBed.overrideComponent(Home, { set: { imports: [], template: '<section id="eventos"></section>' } });
    fixture = TestBed.createComponent(Home); fixture.detectChanges(); await fixture.whenStable();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    scroll = vi.fn(); fixture.nativeElement.querySelector('#eventos').scrollIntoView = scroll;
  });
  afterEach(() => { fixture.destroy(); vi.restoreAllMocks(); });

  it('aguarda as unidades, os eventos e a próxima pintura antes de restaurar a seção', () => {
    fixture.componentInstance.aoCarregarSecao('eventos'); expect(frame).toBeUndefined();
    fixture.componentInstance.aoCarregarSecao('unidades'); expect(scroll).not.toHaveBeenCalled();
    frame!(0); expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    fixture.componentInstance.aoCarregarSecao('eventos'); expect(scroll).toHaveBeenCalledTimes(1);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('mantém a posição normal da home quando não existe fragmento de retorno', () => {
    route.snapshot.fragment = null;
    fixture.componentInstance.aoCarregarSecao('unidades'); fixture.componentInstance.aoCarregarSecao('eventos');
    expect(window.requestAnimationFrame).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled();
  });

  it('cancela o reposicionamento se o usuário sair da home antes da pintura', () => {
    fixture.componentInstance.aoCarregarSecao('unidades'); fixture.componentInstance.aoCarregarSecao('eventos');
    fixture.destroy(); expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
