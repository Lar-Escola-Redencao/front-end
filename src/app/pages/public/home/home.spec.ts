import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';
import { vi } from 'vitest';
import { Home } from './home';

describe('Carregamento da página inicial', () => {
  let fixture: ComponentFixture<Home>;
  let unidades: Subject<unknown[]>;
  let eventos: Subject<unknown[]>;
  let parceiros: Subject<unknown[]>;

  beforeEach(() => {
    unidades = new Subject();
    eventos = new Subject();
    parceiros = new Subject();
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: PublicContentService, useValue: {
          getUnidades: () => unidades,
          getParceirosAtivos: () => parceiros,
          getRedesSociaisAtivas: () => of([]),
          tratarUrlImagem: (url: string) => url,
        } },
        { provide: EventoPublicoService, useValue: { listarPublicos: () => eventos } },
      ],
    });
    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('exibe um único indicador e aguarda todas as seções para revelar o conteúdo', () => {
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelector('.home-carregamento .spinner-carregamento')).not.toBeNull();
    expect(elemento.querySelector<HTMLElement>('.home-conteudo')?.hidden).toBe(true);
    unidades.next([]);
    eventos.next([]);
    fixture.detectChanges();
    expect(elemento.querySelector('.home-carregamento')).not.toBeNull();

    parceiros.next([]);
    fixture.detectChanges();
    expect(elemento.querySelector('.home-carregamento')).toBeNull();
    expect(elemento.querySelector<HTMLElement>('.home-conteudo')?.hidden).toBe(false);
    expect(elemento.querySelector('.spinner-carregamento')).toBeNull();
  });

  it('encerra o carregamento também quando uma consulta falha', () => {
    unidades.next([]);
    eventos.next([]);
    parceiros.error(new Error('Falha na consulta'));
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelector('main')?.getAttribute('aria-busy')).toBe('false');
    expect(elemento.querySelector<HTMLElement>('.home-conteudo')?.hidden).toBe(false);
  });
});

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

  it('aguarda as três seções e a próxima pintura antes de restaurar a posição', () => {
    fixture.componentInstance.aoCarregarSecao('eventos'); expect(frame).toBeUndefined();
    fixture.componentInstance.aoCarregarSecao('unidades'); expect(scroll).not.toHaveBeenCalled();
    expect(frame).toBeUndefined();
    fixture.componentInstance.aoCarregarSecao('parceiros');
    frame!(0); expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    fixture.componentInstance.aoCarregarSecao('eventos'); expect(scroll).toHaveBeenCalledTimes(1);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('mantém a posição normal da home quando não existe fragmento de retorno', () => {
    route.snapshot.fragment = null;
    fixture.componentInstance.aoCarregarSecao('unidades'); fixture.componentInstance.aoCarregarSecao('eventos');
    fixture.componentInstance.aoCarregarSecao('parceiros');
    expect(window.requestAnimationFrame).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled();
  });

  it('cancela o reposicionamento se o usuário sair da home antes da pintura', () => {
    fixture.componentInstance.aoCarregarSecao('unidades'); fixture.componentInstance.aoCarregarSecao('eventos');
    fixture.componentInstance.aoCarregarSecao('parceiros');
    fixture.destroy(); expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
